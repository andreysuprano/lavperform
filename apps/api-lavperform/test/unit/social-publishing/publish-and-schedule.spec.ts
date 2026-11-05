/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-argument, @typescript-eslint/require-await */
import { BadRequestException } from '@nestjs/common';
import { DateTime } from 'luxon';

import { decidePublishOutcome } from 'src/social-publishing/domain/publish-outcome';
import { suggestSlots } from 'src/social-publishing/domain/schedule-slots';
import { readIntegrationsConfig } from 'src/social-publishing/integrations.config';
import { ScheduledPostsService } from 'src/social-publishing/scheduled-posts.service';
import { SocialConnectionsService } from 'src/social-publishing/social-connections.service';
import { TokenCipher } from 'src/social-publishing/token-cipher';

describe('resultado da publicação', () => {
  it('republica só o canal que falhou e esgota as tentativas', () => {
    const first = decidePublishOutcome({
      channels: ['FACEBOOK', 'INSTAGRAM'],
      attempt: 1,
      maxAttempts: 3,
      previous: {},
      fresh: [
        { channel: 'FACEBOOK', ok: true, externalId: 'fb-1' },
        { channel: 'INSTAGRAM', ok: false, error: 'timeout' },
      ],
    });
    expect(first.action).toBe('retry');
    expect(first.lastError).toContain('Instagram: timeout');

    const second = decidePublishOutcome({
      channels: ['FACEBOOK', 'INSTAGRAM'],
      attempt: 3,
      maxAttempts: 3,
      previous: first.channelResults,
      fresh: [{ channel: 'INSTAGRAM', ok: false, error: 'recusado' }],
    });
    expect(second.action).toBe('failed');
    expect(second.channelResults.FACEBOOK).toEqual({
      ok: true,
      externalId: 'fb-1',
    });
    expect(second.lastError).toContain('recusado');
  });

  it('marca publicado quando todos os canais passam', () => {
    const done = decidePublishOutcome({
      channels: ['GOOGLE_BUSINESS'],
      attempt: 2,
      maxAttempts: 3,
      previous: { GOOGLE_BUSINESS: { ok: false, error: 'antes' } },
      fresh: [{ channel: 'GOOGLE_BUSINESS', ok: true, externalId: 'gbp-9' }],
    });
    expect(done.action).toBe('published');
    expect(done.lastError).toBeNull();
  });
});

describe('horários sugeridos', () => {
  it('sugere sexta 18:30 como melhor horário a partir de uma quinta de manhã', () => {
    const now = DateTime.fromISO('2026-11-05T10:00:00', {
      zone: 'America/Sao_Paulo',
    });
    const slots = suggestSlots(now);
    expect(slots.map((slot) => slot.label)).toEqual([
      'Amanhã 9:00',
      'Sex 18:30 · melhor horário',
      'Sáb 10:00',
    ]);
    expect(slots[1].best).toBe(true);
    expect(
      DateTime.fromISO(slots[1].at)
        .setZone('America/Sao_Paulo')
        .toFormat('yyyy-LL-dd HH:mm'),
    ).toBe('2026-11-06 18:30');
    expect(
      DateTime.fromISO(slots[0].at)
        .setZone('America/Sao_Paulo')
        .toFormat('HH:mm'),
    ).toBe('09:00');
  });

  it('pula a sexta quando o horário de 18:30 já passou', () => {
    const now = DateTime.fromISO('2026-11-06T19:00:00', {
      zone: 'America/Sao_Paulo',
    });
    const friday = suggestSlots(now).find((slot) => slot.best);
    expect(
      DateTime.fromISO(friday!.at)
        .setZone('America/Sao_Paulo')
        .toFormat('yyyy-LL-dd HH:mm'),
    ).toBe('2026-11-13 18:30');
  });
});

describe('credenciais ausentes', () => {
  it('não considera Meta ou Google configurados quando o ambiente está vazio', () => {
    const config = readIntegrationsConfig({} as unknown as NodeJS.ProcessEnv);
    expect(config.metaConfigured).toBe(false);
    expect(config.googleConfigured).toBe(false);
    expect(config.googleAdsConfigured).toBe(false);
    expect(config.sandbox).toBe(false);
  });

  it('monta as URIs de retorno a partir da URL pública da API', () => {
    const config = readIntegrationsConfig({
      API_PUBLIC_URL: 'https://api.homolog.exemplo/',
      META_APP_ID: 'app',
      META_APP_SECRET: 'secret',
      GOOGLE_CLIENT_ID: 'id',
      GOOGLE_CLIENT_SECRET: 'secret',
      GOOGLE_ADS_DEVELOPER_TOKEN: 'dev',
      INTEGRATIONS_SANDBOX: 'true',
    } as unknown as NodeJS.ProcessEnv);
    expect(config.metaRedirectUri).toBe(
      'https://api.homolog.exemplo/social-publishing/oauth/meta/callback',
    );
    expect(config.googleRedirectUri).toBe(
      'https://api.homolog.exemplo/social-publishing/oauth/google/callback',
    );
    expect(config.sandbox).toBe(true);
    expect(config.metaConfigured).toBe(true);
  });
});

describe('agendamento e sandbox', () => {
  const companyId = '11111111-1111-4111-8111-111111111111';
  const userId = 'user-1';

  function memory() {
    const connections: any[] = [];
    const posts: any[] = [];
    const prisma: any = {
      userCompany: { findUnique: async () => ({ id: 'link' }) },
      storeSocialConnection: {
        findMany: async () => connections,
        findUnique: async ({ where }: any) =>
          connections.find(
            (row) =>
              row.companyId === where.companyId_provider.companyId &&
              row.provider === where.companyId_provider.provider,
          ) ?? null,
        upsert: async ({ where, create, update }: any) => {
          const current = connections.find(
            (row) =>
              row.companyId === where.companyId_provider.companyId &&
              row.provider === where.companyId_provider.provider,
          );
          if (current) {
            Object.assign(current, update);
            return current;
          }
          const created = { id: `conn-${connections.length}`, ...create };
          connections.push(created);
          return created;
        },
        update: async ({ where, data }: any) => {
          const current = connections.find((row) => row.id === where.id);
          Object.assign(current, data);
          return current;
        },
      },
      scheduledSocialPost: {
        findMany: async () => posts,
        findUnique: async ({ where }: any) =>
          posts.find((row) => row.id === where.id) ?? null,
        create: async ({ data }: any) => {
          const created = {
            id: `post-${posts.length + 1}`,
            draftId: null,
            variationId: null,
            headline: null,
            imageDataUrl: null,
            publishedAt: null,
            attemptCount: 0,
            maxAttempts: 3,
            lastError: null,
            channelResults: null,
            sandbox: false,
            ...data,
          };
          posts.push(created);
          return created;
        },
        update: async ({ where, data }: any) => {
          const current = posts.find((row) => row.id === where.id);
          Object.assign(current, data);
          return current;
        },
        deleteMany: async () => {
          posts.splice(0, posts.length);
          return { count: 0 };
        },
      },
      socialOAuthState: { create: async () => ({}) },
    };
    return { prisma, connections, posts };
  }

  function services(sandbox: boolean) {
    const { prisma, connections, posts } = memory();
    const configService = {
      value: readIntegrationsConfig({
        INTEGRATIONS_SANDBOX: sandbox ? 'true' : 'false',
        JWT_SECRET: 'test-secret',
      } as unknown as NodeJS.ProcessEnv),
    };
    process.env.JWT_SECRET = 'test-secret';
    const cipher = new TokenCipher();
    const meta = {
      authorizationUrl: jest.fn(),
      listPages: jest.fn(),
      listAdAccounts: jest.fn(),
    };
    const google = { authorizationUrl: jest.fn(), listLocations: jest.fn() };
    const connectionService = new SocialConnectionsService(
      prisma,
      configService,
      cipher,
      meta as any,
      google as any,
    );
    const postsService = new ScheduledPostsService(
      prisma,
      configService,
      connectionService,
      cipher,
      meta as any,
      google as any,
    );
    return { connectionService, postsService, connections, posts };
  }

  it('criptografa o token e não devolve o valor original', () => {
    process.env.JWT_SECRET = 'test-secret';
    const cipher = new TokenCipher();
    const encrypted = cipher.encrypt('token-longo');
    expect(encrypted).not.toContain('token-longo');
    expect(cipher.decrypt(encrypted)).toBe('token-longo');
  });

  it('sem credencial e sem sandbox grava o erro e não monta URL', async () => {
    const { connectionService } = services(false);
    const started = await connectionService.begin(userId, companyId, 'META');
    expect(started.configured).toBe(false);
    expect(started.authorizationUrl).toBeNull();
    expect(started.status).toBe('ERROR');
    expect(started.message).toContain('META_APP_ID');
  });

  it('no sandbox conecta Página e Instagram sem chamar a Meta', async () => {
    const { connectionService } = services(true);
    const started = await connectionService.begin(userId, companyId, 'META');
    expect(started.sandbox).toBe(true);
    expect(started.authorizationUrl).toBeNull();
    const assets = await connectionService.assets(userId, companyId, 'META');
    expect(assets).toHaveProperty('pages');
    const selected = await connectionService.selectMeta(userId, companyId, {
      pageId: 'page-homolog',
      igUserId: 'ig-homolog',
      adAccountId: 'act_111222333',
    });
    const meta = selected.connections.find((item) => item.provider === 'META');
    expect(meta).toMatchObject({
      status: 'CONNECTED',
      accountName: 'Lavanderia Homolog',
    });
    expect(JSON.stringify(selected)).not.toContain('sandbox-page-token');
  });

  it('recusa editar ou cancelar depois de publicado e publica no sandbox com retentativa', async () => {
    const { connectionService, postsService, posts, connections } =
      services(true);
    await connectionService.selectMeta(userId, companyId, {
      pageId: 'page-homolog',
      igUserId: 'ig-homolog',
    });
    await connectionService.selectGoogle(userId, companyId, {
      locationId: 'accounts/1/locations/10',
      adCustomerId: null,
    });
    const created = await postsService.create(userId, companyId, {
      channels: ['FACEBOOK', 'INSTAGRAM'],
      caption: 'Legenda de teste',
      publishNow: true,
    });
    await expect(postsService.runAttempt(created.id, 1, 3)).resolves.toBe(
      'done',
    );
    expect(posts[0].status).toBe('PUBLISHED');
    expect(posts[0].channelResults.FACEBOOK.externalId).toContain(
      'sandbox-facebook',
    );
    await expect(
      postsService.update(userId, created.id, { caption: 'nova' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      postsService.cancel(userId, created.id),
    ).rejects.toBeInstanceOf(BadRequestException);

    posts[0].status = 'PUBLISHING';
    posts[0].channelResults = { FACEBOOK: { ok: true, externalId: 'fb' } };
    const metaRow = connections.find((row) => row.provider === 'META');
    metaRow.pageAccessTokenEnc = new TokenCipher().encrypt('page-token');
    metaRow.pageId = 'page-homolog';
    metaRow.igUserId = 'ig-homolog';
    const meta = {
      publishFacebook: jest.fn(),
      publishInstagram: jest.fn().mockRejectedValue(new Error('caiu')),
    };
    const failing = new ScheduledPostsService(
      (postsService as any).prisma,
      (postsService as any).configService,
      connectionService,
      (postsService as any).cipher,
      meta as any,
      {} as any,
    );
    (failing as any).configService = { value: { sandbox: false } };
    posts[0].sandbox = false;
    await expect(failing.runAttempt(created.id, 1, 3)).rejects.toThrow('caiu');
    expect(posts[0].status).toBe('PUBLISHING');
    expect(posts[0].lastError).toContain('Instagram');
    meta.publishInstagram.mockRejectedValue(new Error('ainda'));
    await expect(failing.runAttempt(created.id, 3, 3)).resolves.toBe('done');
    expect(posts[0].status).toBe('FAILED');
    expect(posts[0].attemptCount).toBe(3);
    expect(meta.publishFacebook).not.toHaveBeenCalled();
  });

  it('cancela um post agendado e impede nova edição', async () => {
    const { connectionService, postsService } = services(true);
    await connectionService.selectGoogle(userId, companyId, {
      locationId: 'accounts/1/locations/10',
    });
    const created = await postsService.create(userId, companyId, {
      channels: ['GOOGLE_BUSINESS'],
      caption: 'Novidade',
      scheduledAt: new Date(Date.now() + 86_400_000).toISOString(),
    });
    const cancelled = await postsService.cancel(userId, created.id);
    expect(cancelled.status).toBe('CANCELLED');
    await expect(
      postsService.update(userId, created.id, { caption: 'outra' }),
    ).rejects.toBeInstanceOf(BadRequestException);
  });
});
