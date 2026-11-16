import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  Prisma,
  ScheduledPostStatus,
  SocialPublishChannel,
} from '@prisma/client';

import { GoogleSocialClient } from './clients/google-social.client';
import { MetaSocialClient } from './clients/meta-social.client';
import {
  PublishRetryError,
  decidePublishOutcome,
  type ChannelResult,
} from './domain/publish-outcome';
import { suggestSlots } from './domain/schedule-slots';
import { IntegrationsConfigService } from './integrations.config';
import { SocialConnectionsService } from './social-connections.service';
import { TokenCipher } from './token-cipher';
import { PrismaService } from '../prisma/prisma.service';

const CHANNELS: SocialPublishChannel[] = [
  'FACEBOOK',
  'INSTAGRAM',
  'GOOGLE_BUSINESS',
];

export type ScheduleInput = {
  draftId?: string;
  variationId?: string;
  channels: string[];
  caption: string;
  headline?: string;
  imageDataUrl?: string;
  scheduledAt?: string;
  publishNow?: boolean;
};

@Injectable()
export class ScheduledPostsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: IntegrationsConfigService,
    private readonly connections: SocialConnectionsService,
    private readonly cipher: TokenCipher,
    private readonly meta: MetaSocialClient,
    private readonly google: GoogleSocialClient,
  ) {}

  suggestions() {
    return { zone: 'America/Sao_Paulo', slots: suggestSlots() };
  }

  async list(userId: string, companyId: string, from?: string, to?: string) {
    await this.ensure(userId, companyId);
    const scheduledAt: Prisma.DateTimeFilter = {};
    if (from) scheduledAt.gte = new Date(from);
    if (to) scheduledAt.lte = new Date(to);
    const posts = await this.prisma.scheduledSocialPost.findMany({
      where: {
        companyId,
        status: { not: 'CANCELLED' },
        ...(from || to ? { scheduledAt } : {}),
      },
      orderBy: { scheduledAt: 'asc' },
    });
    return posts.map(present);
  }

  async create(userId: string, companyId: string, input: ScheduleInput) {
    await this.ensure(userId, companyId);
    const channels = uniqueChannels(input.channels);
    const caption = input.caption?.trim();
    if (!caption) throw new BadRequestException('Escreva a legenda');
    if (
      input.imageDataUrl &&
      !/^data:image\/|^https?:\/\//.test(input.imageDataUrl)
    ) {
      throw new BadRequestException(
        'A imagem precisa ser um arquivo enviado ou uma URL',
      );
    }
    await this.assertChannelsReady(companyId, channels);
    const scheduledAt = input.publishNow
      ? new Date()
      : input.scheduledAt
        ? new Date(input.scheduledAt)
        : null;
    if (!scheduledAt || Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Informe o dia e a hora');
    }
    if (!input.publishNow && scheduledAt.getTime() < Date.now() - 60_000) {
      throw new BadRequestException('Escolha um horário no futuro');
    }
    const post = await this.prisma.scheduledSocialPost.create({
      data: {
        companyId,
        draftId: input.draftId,
        variationId: input.variationId,
        channels,
        caption,
        headline: input.headline?.trim() || null,
        imageDataUrl: input.imageDataUrl || null,
        scheduledAt,
        status: 'SCHEDULED',
        sandbox: this.configService.value.sandbox,
      },
    });
    return present(post);
  }

  async update(userId: string, postId: string, input: Partial<ScheduleInput>) {
    const post = await this.owned(userId, postId);
    if (post.status !== 'SCHEDULED') {
      throw new BadRequestException(
        'Só é possível editar um post que ainda não foi publicado',
      );
    }
    const channels = input.channels
      ? uniqueChannels(input.channels)
      : post.channels;
    if (input.channels)
      await this.assertChannelsReady(post.companyId, channels);
    const scheduledAt = input.publishNow
      ? new Date()
      : input.scheduledAt
        ? new Date(input.scheduledAt)
        : undefined;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) {
      throw new BadRequestException('Informe o dia e a hora');
    }
    const updated = await this.prisma.scheduledSocialPost.update({
      where: { id: post.id },
      data: {
        channels,
        caption: input.caption?.trim() || undefined,
        headline:
          input.headline === undefined
            ? undefined
            : input.headline.trim() || null,
        scheduledAt,
      },
    });
    return present(updated);
  }

  async cancel(userId: string, postId: string) {
    const post = await this.owned(userId, postId);
    if (post.status !== 'SCHEDULED' && post.status !== 'FAILED') {
      throw new BadRequestException('Esse post não pode mais ser cancelado');
    }
    const updated = await this.prisma.scheduledSocialPost.update({
      where: { id: post.id },
      data: { status: 'CANCELLED', cancelledAt: new Date() },
    });
    return present(updated);
  }

  async prepareRetry(userId: string, postId: string) {
    const post = await this.owned(userId, postId);
    if (post.status !== 'FAILED') {
      throw new BadRequestException('Só um post que falhou pode ser reenviado');
    }
    await this.prisma.scheduledSocialPost.update({
      where: { id: post.id },
      data: { status: 'SCHEDULED', scheduledAt: new Date(), lastError: null },
    });
    return post.id;
  }

  async runAttempt(
    postId: string,
    attempt: number,
    maxAttempts: number,
  ): Promise<'done' | 'retry'> {
    const post = await this.prisma.scheduledSocialPost.findUnique({
      where: { id: postId },
    });
    if (!post || post.status === 'CANCELLED' || post.status === 'PUBLISHED')
      return 'done';
    if (post.status === 'FAILED') return 'done';
    const previous = (post.channelResults ?? {}) as Record<
      string,
      ChannelResult
    >;
    const pending = post.channels.filter((channel) => !previous[channel]?.ok);
    const fresh: Array<ChannelResult & { channel: string }> = [];
    for (const channel of pending) {
      try {
        const externalId = await this.publishChannel(post, channel);
        fresh.push({ channel, ok: true, externalId });
      } catch (error) {
        fresh.push({
          channel,
          ok: false,
          error: error instanceof Error ? error.message : 'falha ao publicar',
        });
      }
    }
    const decision = decidePublishOutcome({
      channels: post.channels,
      attempt,
      maxAttempts,
      previous,
      fresh,
    });
    await this.prisma.scheduledSocialPost.update({
      where: { id: post.id },
      data: {
        attemptCount: attempt,
        channelResults: decision.channelResults,
        lastError: decision.lastError,
        status:
          decision.action === 'published'
            ? 'PUBLISHED'
            : decision.action === 'failed'
              ? 'FAILED'
              : 'PUBLISHING',
        publishedAt: decision.action === 'published' ? new Date() : null,
      },
    });
    if (decision.action === 'retry') {
      throw new PublishRetryError(decision.lastError ?? 'Falha ao publicar');
    }
    return 'done';
  }

  private async publishChannel(
    post: {
      id: string;
      companyId: string;
      caption: string;
      imageDataUrl: string | null;
      sandbox: boolean;
    },
    channel: SocialPublishChannel,
  ) {
    if (post.sandbox || this.configService.value.sandbox) {
      return `sandbox-${channel.toLowerCase()}-${post.id.slice(0, 8)}`;
    }
    if (channel === 'GOOGLE_BUSINESS') {
      const row = await this.connections.connection(
        post.companyId,
        'GOOGLE_BUSINESS',
      );
      const token = this.cipher.decrypt(row?.accessTokenEnc);
      if (!row?.locationId || !token)
        throw new Error('Google Meu Negócio não está conectado');
      return this.google.publishLocalPost(token, row.locationId, post.caption);
    }
    const row = await this.connections.connection(post.companyId, 'META');
    const pageToken = this.cipher.decrypt(row?.pageAccessTokenEnc);
    if (!pageToken) throw new Error('A Página do Facebook não está conectada');
    if (channel === 'FACEBOOK') {
      if (!row?.pageId) throw new Error('Escolha uma Página do Facebook');
      return this.meta.publishFacebook({
        pageId: row.pageId,
        pageToken,
        caption: post.caption,
        image: post.imageDataUrl,
      });
    }
    if (!row?.igUserId) throw new Error('Escolha o Instagram ligado à Página');
    return this.meta.publishInstagram({
      igUserId: row.igUserId,
      pageToken,
      caption: post.caption,
      image: post.imageDataUrl,
    });
  }

  private async assertChannelsReady(
    companyId: string,
    channels: SocialPublishChannel[],
  ) {
    const meta = channels.some(
      (channel) => channel === 'FACEBOOK' || channel === 'INSTAGRAM',
    )
      ? await this.connections.connection(companyId, 'META')
      : null;
    const google = channels.includes('GOOGLE_BUSINESS')
      ? await this.connections.connection(companyId, 'GOOGLE_BUSINESS')
      : null;
    if (
      channels.includes('FACEBOOK') &&
      (meta?.status !== 'CONNECTED' || !meta.pageId)
    ) {
      throw new BadRequestException(
        'Conecte a Página do Facebook antes de publicar nela',
      );
    }
    if (
      channels.includes('INSTAGRAM') &&
      (meta?.status !== 'CONNECTED' || !meta.igUserId)
    ) {
      throw new BadRequestException(
        'Conecte o Instagram antes de publicar nele',
      );
    }
    if (
      channels.includes('GOOGLE_BUSINESS') &&
      (google?.status !== 'CONNECTED' || !google.locationId)
    ) {
      throw new BadRequestException(
        'Conecte o Google Meu Negócio antes de publicar nele',
      );
    }
  }

  private async owned(userId: string, postId: string) {
    const post = await this.prisma.scheduledSocialPost.findUnique({
      where: { id: postId },
    });
    if (!post) throw new NotFoundException('Post não encontrado');
    await this.ensure(userId, post.companyId);
    return post;
  }

  private async ensure(userId: string, companyId: string) {
    const link = await this.prisma.userCompany.findUnique({
      where: { userId_companyId: { userId, companyId } },
    });
    if (!link)
      throw new ForbiddenException('Usuário sem acesso a esta empresa');
  }
}

function uniqueChannels(values: string[]): SocialPublishChannel[] {
  const channels = [...new Set(values)].filter(
    (value): value is SocialPublishChannel =>
      CHANNELS.includes(value as SocialPublishChannel),
  );
  if (!channels.length)
    throw new BadRequestException('Escolha ao menos uma rede');
  return channels;
}

function present(post: {
  id: string;
  companyId: string;
  draftId: string | null;
  variationId: string | null;
  channels: SocialPublishChannel[];
  caption: string;
  headline: string | null;
  scheduledAt: Date;
  status: ScheduledPostStatus;
  publishedAt: Date | null;
  attemptCount: number;
  maxAttempts: number;
  lastError: string | null;
  channelResults: Prisma.JsonValue;
  sandbox: boolean;
}) {
  return {
    id: post.id,
    companyId: post.companyId,
    draftId: post.draftId,
    variationId: post.variationId,
    channels: post.channels,
    caption: post.caption,
    headline: post.headline,
    scheduledAt: post.scheduledAt,
    status: post.status,
    publishedAt: post.publishedAt,
    attemptCount: post.attemptCount,
    maxAttempts: post.maxAttempts,
    lastError: post.lastError,
    channelResults: post.channelResults,
    sandbox: post.sandbox,
  };
}
