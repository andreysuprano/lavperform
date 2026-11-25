import { IntegrationSessionStatus } from '@prisma/client';
import { IntegrationSessionService } from 'src/integrations/session-refresh/integration-session.service';
import { SessionRefreshError } from 'src/integrations/session-refresh/session-refresh.error';
import { TokenCipher } from 'src/social-publishing/token-cipher';

const NOW = new Date('2026-11-23T18:00:00.000Z');

function jwtWithExp(expSeconds: number): string {
  const header = Buffer.from(JSON.stringify({ alg: 'none' })).toString(
    'base64url',
  );
  const payload = Buffer.from(
    JSON.stringify({ exp: expSeconds, type: 'refresh' }),
  ).toString('base64url');
  return `${header}.${payload}.sig`;
}

describe('IntegrationSessionService', () => {
  const cipher = new TokenCipher();

  beforeAll(() => {
    process.env.JWT_SECRET = 'segredo-de-teste';
  });

  function harness() {
    const prisma = {
      integrationSession: {
        deleteMany: jest.fn(),
        upsert: jest.fn(),
        findMany: jest.fn(),
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      digitalMenuIntegration: {
        update: jest.fn(),
      },
    };
    const engine = { refresh: jest.fn() };
    const service = new IntegrationSessionService(
      prisma as never,
      cipher,
      engine as never,
    );
    return { prisma, engine, service };
  }

  function dueSession(accessToken: string) {
    return {
      id: 'session-1',
      integrationId: 'integration-1',
      companyId: 'company-1',
      partnerSlug: 'MAXLAV',
      accessTokenEnc: cipher.encrypt(accessToken),
      expiresAt: new Date(NOW.getTime() + 10 * 60 * 1000),
      integration: { merchantId: 'loja-1', digitalMenuUrl: null },
    };
  }

  it('remove a sessão quando o token novo não tem validade', async () => {
    const { prisma, service } = harness();

    await service.persist('integration-1', 'company-1', 'MAXLAV', {
      kind: 'static',
    });

    expect(prisma.integrationSession.deleteMany).toHaveBeenCalledWith({
      where: { integrationId: 'integration-1' },
    });
  });

  it('grava o token cifrado e não devolve o valor cru na consulta de resumo', async () => {
    const { prisma, service } = harness();
    prisma.integrationSession.upsert.mockResolvedValue({});

    await service.persist('integration-1', 'company-1', 'maxlav', {
      kind: 'track',
      accessToken: 'token-vivo',
      expiresAt: new Date(NOW.getTime() + 60 * 60 * 1000),
      refreshAfter: NOW,
    });

    const stored = prisma.integrationSession.upsert.mock.calls[0][0].create
      .accessTokenEnc as string;
    expect(stored).not.toContain('token-vivo');
    expect(cipher.decrypt(stored)).toBe('token-vivo');
  });

  it('renova a sessão devida e espelha o token novo na integração', async () => {
    const { prisma, engine, service } = harness();
    const nextExpiry = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
    prisma.integrationSession.findMany.mockResolvedValue([
      dueSession('token-atual'),
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 1 });
    engine.refresh.mockResolvedValue({
      accessToken: 'token-novo',
      expiresAt: nextExpiry,
    });

    await service.refreshDue(NOW);

    expect(engine.refresh).toHaveBeenCalledWith({
      partnerSlug: 'MAXLAV',
      accessToken: 'token-atual',
      merchantId: 'loja-1',
      apiUrl: null,
    });
    expect(prisma.digitalMenuIntegration.update).toHaveBeenCalledWith({
      where: { id: 'integration-1' },
      data: { apiKey: 'token-novo' },
    });
    expect(prisma.integrationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'session-1' },
        data: expect.objectContaining({
          status: IntegrationSessionStatus.ACTIVE,
          expiresAt: nextExpiry,
          refreshAfter: new Date(nextExpiry.getTime() - 5 * 60 * 1000),
          lockedUntil: null,
          lastError: null,
        }),
      }),
    );
  });

  it('renova a Linvo com o token de renovação depois que o acesso vence', async () => {
    const { prisma, engine, service } = harness();
    const refreshToken = jwtWithExp(
      Math.floor(NOW.getTime() / 1000) + 30 * 24 * 60 * 60,
    );
    const nextExpiry = new Date(NOW.getTime() + 2 * 60 * 60 * 1000);
    prisma.integrationSession.findMany.mockResolvedValue([
      {
        ...dueSession('token-vencido'),
        expiresAt: new Date(NOW.getTime() - 60 * 1000),
        integration: {
          merchantId: 'loja-1',
          digitalMenuUrl: null,
          apiSecret: refreshToken,
        },
      },
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 1 });
    engine.refresh.mockResolvedValue({
      accessToken: 'token-novo',
      expiresAt: nextExpiry,
      refreshToken: 'refresh-novo',
    });

    await service.refreshDue(NOW);

    expect(engine.refresh).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerSlug: 'MAXLAV',
        refreshToken,
      }),
    );
    expect(prisma.digitalMenuIntegration.update).toHaveBeenCalledWith({
      where: { id: 'integration-1' },
      data: { apiKey: 'token-novo', apiSecret: 'refresh-novo' },
    });
  });

  it('usa o horário de renovação devolvido pelo parceiro', async () => {
    const { prisma, engine, service } = harness();
    const nextExpiry = new Date(NOW.getTime() + 20 * 24 * 60 * 60 * 1000);
    const refreshAfter = new Date(NOW.getTime() + 12 * 60 * 60 * 1000);
    prisma.integrationSession.findMany.mockResolvedValue([
      dueSession('cookie-atual'),
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 1 });
    engine.refresh.mockResolvedValue({
      accessToken: 'cookie-novo',
      expiresAt: nextExpiry,
      refreshAfter,
    });

    await service.refreshDue(NOW);

    expect(prisma.integrationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ refreshAfter }),
      }),
    );
  });

  it('pede um token novo quando o parceiro recusa a sessão', async () => {
    const { prisma, engine, service } = harness();
    prisma.integrationSession.findMany.mockResolvedValue([
      dueSession('token-atual'),
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 1 });
    engine.refresh.mockRejectedValue(
      new SessionRefreshError('token recusado', 'rejected'),
    );

    await service.refreshDue(NOW);

    expect(prisma.digitalMenuIntegration.update).not.toHaveBeenCalled();
    expect(prisma.integrationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: IntegrationSessionStatus.NEEDS_REAUTH,
          lastError: 'token recusado',
        }),
      }),
    );
  });

  it('mantém o token atual quando a renovação ainda não está ligada', async () => {
    const { prisma, engine, service } = harness();
    prisma.integrationSession.findMany.mockResolvedValue([
      dueSession('token-atual'),
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 1 });
    engine.refresh.mockRejectedValue(
      new SessionRefreshError('ainda não ligada', 'unavailable'),
    );

    await service.refreshDue(NOW);

    expect(prisma.digitalMenuIntegration.update).not.toHaveBeenCalled();
    expect(prisma.integrationSession.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          refreshAfter: new Date(NOW.getTime() + 15 * 60 * 1000),
          lastError: 'ainda não ligada',
        }),
      }),
    );
    const data = prisma.integrationSession.update.mock.calls[0][0].data;
    expect(data.status).toBeUndefined();
  });

  it('não chama o motor se outra réplica já segurou a sessão', async () => {
    const { prisma, engine, service } = harness();
    prisma.integrationSession.findMany.mockResolvedValue([
      dueSession('token-atual'),
    ]);
    prisma.integrationSession.updateMany.mockResolvedValue({ count: 0 });

    await service.refreshDue(NOW);

    expect(engine.refresh).not.toHaveBeenCalled();
  });

  it('para a importação quando a sessão pede novo cadastro', async () => {
    const { prisma, service } = harness();
    prisma.integrationSession.findUnique.mockResolvedValue({
      status: IntegrationSessionStatus.NEEDS_REAUTH,
      accessTokenEnc: cipher.encrypt('token-velho'),
    });

    await expect(
      service.currentAccessToken('integration-1', 'api-key'),
    ).resolves.toBeNull();
  });

  it('usa o apiKey legado quando a integração ainda não tem sessão', async () => {
    const { prisma, service } = harness();
    prisma.integrationSession.findUnique.mockResolvedValue(null);

    await expect(
      service.currentAccessToken('integration-1', 'api-key'),
    ).resolves.toBe('api-key');
  });
});
