import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import { Prisma } from '@prisma/client';

import { GoogleSocialClient } from './clients/google-social.client';
import { MetaSocialClient } from './clients/meta-social.client';
import {
  GOOGLE_CREDENTIALS_MISSING,
  META_CREDENTIALS_MISSING,
  SANDBOX_AD_ACCOUNTS,
  SANDBOX_ADS_CUSTOMERS,
  SANDBOX_ADS_METRICS,
  SANDBOX_LOCATIONS,
  SANDBOX_PAGES,
  SANDBOX_REVIEWS,
  buildSandboxSeed,
  sandboxProfile,
} from './domain/sandbox-data';
import { IntegrationsConfigService } from './integrations.config';
import { TokenCipher } from './token-cipher';
import { PrismaService } from '../prisma/prisma.service';

type Provider = 'META' | 'GOOGLE_BUSINESS' | 'GOOGLE_ADS';

const CLEARED = {
  accessTokenEnc: null,
  refreshTokenEnc: null,
  pageAccessTokenEnc: null,
  tokenExpiresAt: null,
  pageId: null,
  pageName: null,
  igUserId: null,
  igUsername: null,
  adAccountId: null,
  adAccountName: null,
  accountName: null,
  locationId: null,
  locationName: null,
  locationAddress: null,
  customerId: null,
  customerName: null,
  connectedAt: null,
};

@Injectable()
export class SocialConnectionsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: IntegrationsConfigService,
    private readonly cipher: TokenCipher,
    private readonly meta: MetaSocialClient,
    private readonly google: GoogleSocialClient,
  ) {}

  private get config() {
    return this.configService.value;
  }

  async overview(userId: string, companyId: string) {
    await this.ensure(userId, companyId);
    const rows = await this.prisma.storeSocialConnection.findMany({
      where: { companyId },
    });
    const by = new Map(rows.map((row) => [row.provider, row]));
    const ads = by.get('GOOGLE_ADS');
    const metrics =
      ads?.status === 'CONNECTED' ? await this.safeAdsMetrics(ads) : null;
    return {
      sandbox: this.config.sandbox,
      metaConfigured: this.config.metaConfigured || this.config.sandbox,
      googleConfigured: this.config.googleConfigured || this.config.sandbox,
      googleAdsConfigured:
        this.config.googleAdsConfigured || this.config.sandbox,
      connections: [
        this.view('META', by.get('META'), this.config.metaConfigured),
        this.view(
          'GOOGLE_BUSINESS',
          by.get('GOOGLE_BUSINESS'),
          this.config.googleConfigured,
        ),
        this.view('GOOGLE_ADS', ads, this.config.googleConfigured, metrics),
      ],
    };
  }

  async begin(userId: string, companyId: string, provider: Provider) {
    await this.ensure(userId, companyId);
    const family = provider === 'META' ? 'META' : 'GOOGLE';
    const configured =
      family === 'META'
        ? this.config.metaConfigured
        : this.config.googleConfigured;
    if (this.config.sandbox) {
      await this.touch(
        companyId,
        provider === 'META' ? 'META' : 'GOOGLE_BUSINESS',
        {
          status: 'CONNECTING',
          sandbox: true,
          lastError: null,
        },
      );
      if (provider !== 'META') {
        await this.touch(companyId, 'GOOGLE_ADS', {
          status: 'CONNECTING',
          sandbox: true,
          lastError: null,
        });
      }
      return {
        sandbox: true,
        configured: true,
        authorizationUrl: null as string | null,
        message: null as string | null,
        status: 'CONNECTING' as const,
      };
    }
    if (!configured) {
      const message =
        family === 'META'
          ? META_CREDENTIALS_MISSING
          : GOOGLE_CREDENTIALS_MISSING;
      await this.touch(companyId, provider, {
        status: 'ERROR',
        lastError: message,
        sandbox: false,
      });
      return {
        sandbox: false,
        configured: false,
        authorizationUrl: null,
        message,
        status: 'ERROR' as const,
      };
    }
    const state = randomBytes(24).toString('hex');
    await this.prisma.socialOAuthState.create({
      data: {
        state,
        companyId,
        userId,
        provider,
        expiresAt: new Date(Date.now() + 15 * 60 * 1000),
      },
    });
    await this.touch(companyId, provider, {
      status: 'CONNECTING',
      lastError: null,
      sandbox: false,
    });
    const authorizationUrl =
      family === 'META'
        ? this.meta.authorizationUrl(this.config, state)
        : this.google.authorizationUrl(this.config, state);
    return {
      sandbox: false,
      configured: true,
      authorizationUrl,
      message: null,
      status: 'CONNECTING' as const,
    };
  }

  async cancel(userId: string, companyId: string, provider: Provider) {
    await this.ensure(userId, companyId);
    const targets: Provider[] =
      provider === 'META' ? ['META'] : ['GOOGLE_BUSINESS', 'GOOGLE_ADS'];
    for (const target of targets) {
      const row = await this.row(companyId, target);
      if (row?.status === 'CONNECTING') {
        await this.prisma.storeSocialConnection.update({
          where: { id: row.id },
          data: { status: 'DISCONNECTED', lastError: null },
        });
      }
    }
    return this.overview(userId, companyId);
  }

  async disconnect(userId: string, companyId: string, provider: Provider) {
    await this.ensure(userId, companyId);
    await this.touch(companyId, provider, {
      ...CLEARED,
      status: 'DISCONNECTED',
      lastError: null,
      metadata: Prisma.JsonNull,
      sandbox: false,
    });
    return this.overview(userId, companyId);
  }

  async retry(userId: string, companyId: string, provider: Provider) {
    await this.ensure(userId, companyId);
    const row = await this.row(companyId, provider);
    if (this.config.sandbox || row?.sandbox) {
      if (provider === 'META') {
        const page = SANDBOX_PAGES[0];
        await this.touch(companyId, 'META', {
          status: 'CONNECTED',
          sandbox: true,
          lastError: null,
          pageId: page.id,
          pageName: page.name,
          igUserId: page.instagram?.id,
          igUsername: page.instagram?.username,
          adAccountId: SANDBOX_AD_ACCOUNTS[0].id,
          adAccountName: SANDBOX_AD_ACCOUNTS[0].name,
          connectedAt: new Date(),
        });
      } else if (provider === 'GOOGLE_BUSINESS') {
        const location = SANDBOX_LOCATIONS[0];
        await this.touch(companyId, 'GOOGLE_BUSINESS', {
          status: 'CONNECTED',
          sandbox: true,
          lastError: null,
          locationId: location.id,
          locationName: location.name,
          locationAddress: location.address,
          accountName: 'accounts/1',
          connectedAt: new Date(),
        });
      } else {
        const customer = SANDBOX_ADS_CUSTOMERS[0];
        await this.touch(companyId, 'GOOGLE_ADS', {
          status: 'CONNECTED',
          sandbox: true,
          lastError: null,
          customerId: customer.id,
          customerName: customer.name,
          connectedAt: new Date(),
        });
      }
      return this.overview(userId, companyId);
    }
    if (!row?.accessTokenEnc) return this.begin(userId, companyId, provider);
    try {
      await this.assets(
        userId,
        companyId,
        provider === 'META' ? 'META' : 'GOOGLE',
      );
      if (row.pageId || row.locationId || row.customerId) {
        await this.prisma.storeSocialConnection.update({
          where: { id: row.id },
          data: { status: 'CONNECTED', lastError: null },
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao tentar de novo';
      await this.prisma.storeSocialConnection.update({
        where: { id: row.id },
        data: { status: 'ERROR', lastError: message },
      });
    }
    return this.overview(userId, companyId);
  }

  async assets(userId: string, companyId: string, family: 'META' | 'GOOGLE') {
    await this.ensure(userId, companyId);
    if (
      this.config.sandbox ||
      (
        await this.row(
          companyId,
          family === 'META' ? 'META' : 'GOOGLE_BUSINESS',
        )
      )?.sandbox
    ) {
      if (family === 'META') {
        return {
          pages: SANDBOX_PAGES.map((page) => ({
            id: page.id,
            name: page.name,
            followers: page.followers,
            instagram: page.instagram,
          })),
          adAccounts: SANDBOX_AD_ACCOUNTS,
        };
      }
      return {
        locations: SANDBOX_LOCATIONS,
        adAccounts: SANDBOX_ADS_CUSTOMERS,
      };
    }
    const token = await this.userToken(
      companyId,
      family === 'META' ? 'META' : 'GOOGLE_BUSINESS',
    );
    if (family === 'META') {
      const [pages, adAccounts] = await Promise.all([
        this.meta.listPages(token),
        this.meta.listAdAccounts(token).catch(() => []),
      ]);
      return {
        pages: pages.map((page) => ({
          id: page.id,
          name: page.name,
          followers: page.followers,
          instagram: page.instagram,
        })),
        adAccounts,
      };
    }
    const [locations, adAccounts] = await Promise.all([
      this.google.listLocations(token),
      this.google
        .listAdsCustomers(token, this.config.googleAdsDeveloperToken)
        .catch(() => []),
    ]);
    return { locations, adAccounts };
  }

  async selectMeta(
    userId: string,
    companyId: string,
    input: {
      pageId: string;
      igUserId?: string | null;
      adAccountId?: string | null;
    },
  ) {
    await this.ensure(userId, companyId);
    const sandbox =
      this.config.sandbox ||
      (await this.row(companyId, 'META'))?.sandbox === true;
    if (sandbox) {
      const page = SANDBOX_PAGES.find((item) => item.id === input.pageId);
      if (!page) throw new BadRequestException('Escolha uma Página da lista');
      const ig = input.igUserId
        ? page.instagram?.id === input.igUserId
          ? page.instagram
          : null
        : page.instagram;
      if (input.igUserId && !ig) {
        throw new BadRequestException(
          'Esse Instagram não está ligado à Página escolhida',
        );
      }
      const ad = SANDBOX_AD_ACCOUNTS.find(
        (item) => item.id === input.adAccountId,
      );
      await this.touch(companyId, 'META', {
        status: 'CONNECTED',
        sandbox: true,
        lastError: null,
        pageId: page.id,
        pageName: page.name,
        igUserId: ig?.id ?? null,
        igUsername: ig?.username ?? null,
        adAccountId: ad?.id ?? null,
        adAccountName: ad?.name ?? null,
        connectedAt: new Date(),
      });
      return this.overview(userId, companyId);
    }
    const token = await this.userToken(companyId, 'META');
    const pages = await this.meta.listPages(token);
    const page = pages.find((item) => item.id === input.pageId);
    if (!page) throw new BadRequestException('Escolha uma Página da lista');
    const ig = input.igUserId
      ? page.instagram?.id === input.igUserId
        ? page.instagram
        : null
      : null;
    if (input.igUserId && !ig) {
      throw new BadRequestException(
        'Esse Instagram não está ligado à Página escolhida',
      );
    }
    const ads = input.adAccountId
      ? await this.meta.listAdAccounts(token).catch(() => [])
      : [];
    const ad = ads.find((item) => item.id === input.adAccountId);
    await this.touch(companyId, 'META', {
      status: 'CONNECTED',
      sandbox: false,
      lastError: null,
      pageId: page.id,
      pageName: page.name,
      pageAccessTokenEnc: page.accessToken
        ? this.cipher.encrypt(page.accessToken)
        : null,
      igUserId: ig?.id ?? null,
      igUsername: ig?.username ?? null,
      adAccountId: ad?.id ?? null,
      adAccountName: ad?.name ?? null,
      connectedAt: new Date(),
    });
    return this.overview(userId, companyId);
  }

  async selectGoogle(
    userId: string,
    companyId: string,
    input: { locationId: string; adCustomerId?: string | null },
  ) {
    await this.ensure(userId, companyId);
    const sandbox =
      this.config.sandbox ||
      (await this.row(companyId, 'GOOGLE_BUSINESS'))?.sandbox === true;
    if (sandbox) {
      const location = SANDBOX_LOCATIONS.find(
        (item) => item.id === input.locationId,
      );
      if (!location)
        throw new BadRequestException('Escolha um perfil da lista');
      await this.touch(companyId, 'GOOGLE_BUSINESS', {
        status: 'CONNECTED',
        sandbox: true,
        lastError: null,
        locationId: location.id,
        locationName: location.name,
        locationAddress: location.address,
        accountName: 'accounts/1',
        connectedAt: new Date(),
      });
      const customer = SANDBOX_ADS_CUSTOMERS.find(
        (item) => item.id === input.adCustomerId,
      );
      await this.touch(
        companyId,
        'GOOGLE_ADS',
        customer
          ? {
              status: 'CONNECTED',
              sandbox: true,
              lastError: null,
              customerId: customer.id,
              customerName: customer.name,
              connectedAt: new Date(),
            }
          : {
              ...CLEARED,
              status: 'DISCONNECTED',
              sandbox: true,
              lastError: null,
            },
      );
      return this.overview(userId, companyId);
    }
    const business = await this.row(companyId, 'GOOGLE_BUSINESS');
    const token = await this.userToken(companyId, 'GOOGLE_BUSINESS');
    const locations = await this.google.listLocations(token);
    const location = locations.find((item) => item.id === input.locationId);
    if (!location) throw new BadRequestException('Escolha um perfil da lista');
    await this.touch(companyId, 'GOOGLE_BUSINESS', {
      status: 'CONNECTED',
      sandbox: false,
      lastError: null,
      locationId: location.id,
      locationName: location.name,
      locationAddress: location.address,
      accessTokenEnc: business?.accessTokenEnc,
      refreshTokenEnc: business?.refreshTokenEnc,
      tokenExpiresAt: business?.tokenExpiresAt,
      connectedAt: new Date(),
    });
    if (!input.adCustomerId) {
      await this.touch(companyId, 'GOOGLE_ADS', {
        ...CLEARED,
        status: 'DISCONNECTED',
        sandbox: false,
        lastError: null,
      });
    } else {
      const customers = await this.google.listAdsCustomers(
        token,
        this.config.googleAdsDeveloperToken,
      );
      const customer = customers.find((item) => item.id === input.adCustomerId);
      if (!customer)
        throw new BadRequestException('Escolha uma conta de anúncios da lista');
      await this.touch(companyId, 'GOOGLE_ADS', {
        status: 'CONNECTED',
        sandbox: false,
        lastError: null,
        customerId: customer.id,
        customerName: customer.name,
        accessTokenEnc: business?.accessTokenEnc,
        refreshTokenEnc: business?.refreshTokenEnc,
        tokenExpiresAt: business?.tokenExpiresAt,
        connectedAt: new Date(),
      });
    }
    return this.overview(userId, companyId);
  }

  async completeOAuth(
    providerFamily: 'META' | 'GOOGLE',
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
  ) {
    const stored = state
      ? await this.prisma.socialOAuthState.findUnique({ where: { state } })
      : null;
    const finish = (step: string, message?: string) =>
      this.redirect(
        stored?.provider ??
          (providerFamily === 'META' ? 'META' : 'GOOGLE_BUSINESS'),
        step,
        message,
      );
    if (!stored || stored.expiresAt.getTime() < Date.now()) {
      return finish('error', 'O login expirou. Tente conectar de novo.');
    }
    await this.prisma.socialOAuthState.delete({ where: { id: stored.id } });
    if (error || !code) {
      await this.touch(stored.companyId, stored.provider, {
        status: 'ERROR',
        lastError: 'O login foi cancelado ou recusado.',
      });
      return finish('error', 'O login foi cancelado ou recusado.');
    }
    try {
      if (providerFamily === 'META') {
        const accessToken = await this.meta.exchangeCode(this.config, code);
        await this.touch(stored.companyId, 'META', {
          status: 'CONNECTING',
          sandbox: false,
          lastError: null,
          accessTokenEnc: this.cipher.encrypt(accessToken),
        });
      } else {
        const tokens = await this.google.exchangeCode(this.config, code);
        const data = {
          status: 'CONNECTING' as const,
          sandbox: false,
          lastError: null,
          accessTokenEnc: this.cipher.encrypt(tokens.accessToken),
          refreshTokenEnc: tokens.refreshToken
            ? this.cipher.encrypt(tokens.refreshToken)
            : null,
          tokenExpiresAt: tokens.expiresAt,
        };
        await this.touch(stored.companyId, 'GOOGLE_BUSINESS', data);
        await this.touch(stored.companyId, 'GOOGLE_ADS', data);
      }
      return finish('select');
    } catch (caught) {
      const message =
        caught instanceof Error ? caught.message : 'Falha ao conectar';
      await this.touch(stored.companyId, stored.provider, {
        status: 'ERROR',
        lastError: message,
      });
      return finish('error', message);
    }
  }

  async googleProfile(userId: string, companyId: string) {
    await this.ensure(userId, companyId);
    const row = await this.row(companyId, 'GOOGLE_BUSINESS');
    if (!row || row.status !== 'CONNECTED' || !row.locationId) {
      return { connected: false, profile: null, reviews: [], posts: [] };
    }
    const posts = await this.prisma.scheduledSocialPost.findMany({
      where: {
        companyId,
        channels: { has: 'GOOGLE_BUSINESS' },
        status: { not: 'CANCELLED' },
      },
      orderBy: { scheduledAt: 'desc' },
      take: 20,
    });
    if (row.sandbox || this.config.sandbox) {
      const metadata = (row.metadata ?? {}) as {
        replies?: Record<string, string>;
      };
      const reviews = SANDBOX_REVIEWS.map((review) => ({
        ...review,
        reply: metadata.replies?.[review.id] ?? review.reply,
      }));
      return {
        connected: true,
        profile: sandboxProfile(row.locationId),
        reviews,
        posts: posts.map(presentPost),
      };
    }
    try {
      const token = await this.freshGoogleToken(row);
      const [remote, insights] = await Promise.all([
        this.google.profileAndReviews(token, row.locationId),
        this.google.insights(token, row.locationId).catch(() =>
          sandboxProfile().insights.map((item) => ({
            ...item,
            value: '—',
            delta: '',
          })),
        ),
      ]);
      return {
        connected: true,
        profile: {
          name: row.locationName,
          address: row.locationAddress,
          hours: null,
          rating: remote.rating,
          reviewCount: remote.reviewCount,
          mapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(row.locationName ?? '')}`,
          insights,
        },
        reviews: remote.reviews,
        posts: posts.map(presentPost),
      };
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Falha ao ler o perfil';
      await this.prisma.storeSocialConnection.update({
        where: { id: row.id },
        data: { status: 'ERROR', lastError: message },
      });
      throw new BadRequestException(message);
    }
  }

  async replyReview(
    userId: string,
    companyId: string,
    reviewId: string,
    comment: string,
  ) {
    await this.ensure(userId, companyId);
    const row = await this.row(companyId, 'GOOGLE_BUSINESS');
    if (!row || row.status !== 'CONNECTED') {
      throw new BadRequestException(
        'Conecte o Google Meu Negócio antes de responder',
      );
    }
    const text = comment.trim();
    if (!text) throw new BadRequestException('Escreva a resposta');
    if (row.sandbox || this.config.sandbox) {
      const metadata = (row.metadata ?? {}) as {
        replies?: Record<string, string>;
      };
      const replies = { ...(metadata.replies ?? {}), [reviewId]: text };
      await this.prisma.storeSocialConnection.update({
        where: { id: row.id },
        data: { metadata: { ...metadata, replies } },
      });
      return { id: reviewId, reply: text };
    }
    const token = await this.freshGoogleToken(row);
    await this.google.replyReview(token, reviewId, text);
    return { id: reviewId, reply: text };
  }

  async seed(userId: string, companyId: string) {
    await this.ensure(userId, companyId);
    if (!this.config.sandbox) {
      throw new ForbiddenException(
        'O seed de teste só existe com INTEGRATIONS_SANDBOX=true',
      );
    }
    const plan = buildSandboxSeed(companyId);
    for (const connection of plan.connections) {
      await this.prisma.storeSocialConnection.upsert({
        where: {
          companyId_provider: { companyId, provider: connection.provider },
        },
        create: connection,
        update: connection,
      });
    }
    await this.prisma.scheduledSocialPost.deleteMany({
      where: { companyId, sandbox: true },
    });
    for (const post of plan.posts) {
      await this.prisma.scheduledSocialPost.create({
        data: post as Prisma.ScheduledSocialPostUncheckedCreateInput,
      });
    }
    return this.overview(userId, companyId);
  }

  connection(companyId: string, provider: Provider) {
    return this.row(companyId, provider);
  }

  decrypt(payload: string | null | undefined) {
    return this.cipher.decrypt(payload);
  }

  private async safeAdsMetrics(row: {
    sandbox: boolean;
    customerId: string | null;
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    tokenExpiresAt: Date | null;
    id: string;
  }) {
    if (row.sandbox || this.config.sandbox) return SANDBOX_ADS_METRICS;
    if (!row.customerId || !this.config.googleAdsDeveloperToken) return null;
    try {
      const token = await this.freshGoogleToken(row);
      return await this.google.adsMetrics(
        token,
        this.config.googleAdsDeveloperToken,
        row.customerId,
      );
    } catch {
      return null;
    }
  }

  private async freshGoogleToken(row: {
    id: string;
    accessTokenEnc: string | null;
    refreshTokenEnc: string | null;
    tokenExpiresAt: Date | null;
  }) {
    const current = this.cipher.decrypt(row.accessTokenEnc);
    if (!current) throw new Error('Token do Google ausente');
    if (
      !row.tokenExpiresAt ||
      row.tokenExpiresAt.getTime() > Date.now() + 60_000
    )
      return current;
    const refresh = this.cipher.decrypt(row.refreshTokenEnc);
    if (!refresh) return current;
    const next = await this.google.refresh(this.config, refresh);
    await this.prisma.storeSocialConnection.update({
      where: { id: row.id },
      data: {
        accessTokenEnc: this.cipher.encrypt(next.accessToken),
        tokenExpiresAt: next.expiresAt,
      },
    });
    return next.accessToken;
  }

  private async userToken(companyId: string, provider: Provider) {
    const row = await this.row(companyId, provider);
    const token = this.cipher.decrypt(row?.accessTokenEnc);
    if (!token)
      throw new BadRequestException(
        'Conecte a conta antes de escolher o perfil',
      );
    return token;
  }

  private view(
    provider: Provider,
    row:
      | {
          status: string;
          pageName: string | null;
          igUsername: string | null;
          locationName: string | null;
          locationAddress: string | null;
          customerName: string | null;
          customerId: string | null;
          lastError: string | null;
          sandbox: boolean;
        }
      | undefined,
    configured: boolean,
    metrics: Array<{ label: string; value: string }> | null = null,
  ) {
    const status = row?.status ?? 'DISCONNECTED';
    const accountName =
      provider === 'META'
        ? (row?.pageName ?? null)
        : provider === 'GOOGLE_BUSINESS'
          ? (row?.locationName ?? null)
          : (row?.customerName ?? null);
    const accountDetail =
      provider === 'META'
        ? [
            row?.pageName ? 'Página do Facebook' : null,
            row?.igUsername ? `@${row.igUsername} no Instagram` : null,
          ]
            .filter(Boolean)
            .join(' · ') || null
        : provider === 'GOOGLE_BUSINESS'
          ? (row?.locationAddress ?? null)
          : (row?.customerId ?? null);
    return {
      provider,
      status,
      configured: configured || this.config.sandbox,
      sandbox: row?.sandbox ?? this.config.sandbox,
      accountName,
      accountDetail,
      lastError: row?.lastError ?? null,
      metrics: provider === 'GOOGLE_ADS' ? metrics : null,
    };
  }

  private async touch(
    companyId: string,
    provider: Provider,
    data: Record<string, unknown>,
  ) {
    return this.prisma.storeSocialConnection.upsert({
      where: { companyId_provider: { companyId, provider } },
      create: {
        companyId,
        provider,
        ...data,
      },
      update: data,
    });
  }

  private row(companyId: string, provider: Provider) {
    return this.prisma.storeSocialConnection.findUnique({
      where: { companyId_provider: { companyId, provider } },
    });
  }

  private async ensure(userId: string, companyId: string) {
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!link)
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
  }

  private redirect(provider: string, step: string, message?: string) {
    const base = this.config.appPublicUrl || '';
    const params = new URLSearchParams({ provider, step });
    if (message) params.set('message', message);
    if (!base) {
      return {
        type: 'html' as const,
        body: `<p>Conexão ${step === 'select' ? 'recebida' : 'não concluída'}.</p><p>${message ?? 'Volte ao LavPerform para escolher a conta.'}</p>`,
      };
    }
    return {
      type: 'redirect' as const,
      url: `${base}/integrations?${params.toString()}`,
    };
  }
}

function presentPost(post: {
  id: string;
  headline: string | null;
  caption: string;
  status: string;
  scheduledAt: Date;
  channels: string[];
}) {
  return {
    id: post.id,
    headline: post.headline,
    caption: post.caption,
    status: post.status,
    scheduledAt: post.scheduledAt,
    channels: post.channels,
  };
}

export function parseProvider(value: string): Provider {
  if (value === 'meta' || value === 'META') return 'META';
  if (value === 'google-business' || value === 'GOOGLE_BUSINESS')
    return 'GOOGLE_BUSINESS';
  if (value === 'google-ads' || value === 'GOOGLE_ADS') return 'GOOGLE_ADS';
  throw new NotFoundException('Integração desconhecida');
}
