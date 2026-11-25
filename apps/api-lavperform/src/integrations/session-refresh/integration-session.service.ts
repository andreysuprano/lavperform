import { Injectable, Logger } from '@nestjs/common';
import { IntegrationSessionStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { TokenCipher } from '../../social-publishing/token-cipher';
import { IntegrationsEngineSessionClient } from './integrations-engine-session.client';
import { SessionRefreshError } from './session-refresh.error';
import {
  clipError,
  PastedTokenPlan,
  normalizeAccessToken,
  readJwtExpiry,
  refreshAfterFor,
  SESSION_LOCK_MS,
  SESSION_REFRESH_BACKOFF_MS,
} from './session-window';

export interface IntegrationSessionView {
  status: 'ACTIVE' | 'NEEDS_REAUTH';
  expiresAt: Date;
  lastError: string | null;
}

type DueSession = {
  id: string;
  integrationId: string;
  companyId: string;
  partnerSlug: string;
  accessTokenEnc: string;
  expiresAt: Date;
  integration: {
    merchantId: string | null;
    digitalMenuUrl: string | null;
    apiSecret: string | null;
  };
};

@Injectable()
export class IntegrationSessionService {
  private readonly logger = new Logger(IntegrationSessionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly cipher: TokenCipher,
    private readonly engine: IntegrationsEngineSessionClient,
  ) {}

  async persist(
    integrationId: string,
    companyId: string,
    partnerSlug: string,
    plan: Extract<PastedTokenPlan, { kind: 'static' | 'track' }>,
  ): Promise<void> {
    if (plan.kind === 'static') {
      await this.prisma.integrationSession.deleteMany({
        where: { integrationId },
      });
      return;
    }

    const accessTokenEnc = this.cipher.encrypt(plan.accessToken);
    await this.prisma.integrationSession.upsert({
      where: { integrationId },
      create: {
        integrationId,
        companyId,
        partnerSlug: partnerSlug.trim().toUpperCase(),
        accessTokenEnc,
        expiresAt: plan.expiresAt,
        refreshAfter: plan.refreshAfter,
        status: IntegrationSessionStatus.ACTIVE,
      },
      update: {
        companyId,
        partnerSlug: partnerSlug.trim().toUpperCase(),
        accessTokenEnc,
        expiresAt: plan.expiresAt,
        refreshAfter: plan.refreshAfter,
        status: IntegrationSessionStatus.ACTIVE,
        lockedUntil: null,
        lastError: null,
      },
    });
  }

  async summarize(
    integrationIds: string[],
  ): Promise<Map<string, IntegrationSessionView>> {
    if (integrationIds.length === 0) return new Map();
    const rows = await this.prisma.integrationSession.findMany({
      where: { integrationId: { in: integrationIds } },
      select: {
        integrationId: true,
        status: true,
        expiresAt: true,
        lastError: true,
      },
    });
    return new Map(
      rows.map((row) => [
        row.integrationId,
        {
          status: row.status,
          expiresAt: row.expiresAt,
          lastError: row.lastError,
        },
      ]),
    );
  }

  /**
   * Token que a importação deve usar. Sem sessão, devolve o apiKey legado.
   * Sessão pedindo novo cadastro devolve null para a importação parar.
   */
  async currentAccessToken(
    integrationId: string,
    fallback?: string | null,
  ): Promise<string | null> {
    const row = await this.prisma.integrationSession.findUnique({
      where: { integrationId },
    });
    if (!row) return fallback ?? null;
    if (row.status === IntegrationSessionStatus.NEEDS_REAUTH) return null;

    try {
      return this.cipher.decrypt(row.accessTokenEnc) ?? fallback ?? null;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markNeedsReauth(row.id, message);
      return null;
    }
  }

  async refreshDue(now = new Date()): Promise<void> {
    const due = await this.prisma.integrationSession.findMany({
      where: {
        status: IntegrationSessionStatus.ACTIVE,
        refreshAfter: { lte: now },
        integration: { active: true },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      orderBy: { refreshAfter: 'asc' },
      take: 20,
      include: {
        integration: {
          select: { merchantId: true, digitalMenuUrl: true, apiSecret: true },
        },
      },
    });

    for (const session of due) {
      await this.refreshOne(session, now);
    }
  }

  private async refreshOne(session: DueSession, now: Date): Promise<void> {
    const claimed = await this.prisma.integrationSession.updateMany({
      where: {
        id: session.id,
        status: IntegrationSessionStatus.ACTIVE,
        refreshAfter: { lte: now },
        OR: [{ lockedUntil: null }, { lockedUntil: { lt: now } }],
      },
      data: { lockedUntil: new Date(now.getTime() + SESSION_LOCK_MS) },
    });
    if (claimed.count !== 1) return;

    const linvoRefreshToken =
      session.partnerSlug === 'MAXLAV'
        ? normalizeAccessToken(session.integration.apiSecret ?? undefined)
        : '';
    const linvoRefreshExpiry = linvoRefreshToken
      ? readJwtExpiry(linvoRefreshToken)
      : null;
    const linvoCanRefresh =
      linvoRefreshExpiry != null && linvoRefreshExpiry.getTime() > now.getTime();

    if (session.expiresAt.getTime() <= now.getTime() && !linvoCanRefresh) {
      await this.markNeedsReauth(
        session.id,
        session.partnerSlug === 'MAXLAV'
          ? 'A sessão da Linvo expirou. Cole o token de acesso e o token de renovação de novo.'
          : 'O token expirou antes de ser renovado. Cole um token ainda válido.',
      );
      return;
    }

    let current: string | null;
    try {
      current = this.cipher.decrypt(session.accessTokenEnc);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await this.markNeedsReauth(session.id, message);
      return;
    }
    if (!current) {
      await this.markNeedsReauth(session.id, 'Token da sessão ausente');
      return;
    }

    try {
      const next = await this.engine.refresh({
        partnerSlug: session.partnerSlug,
        accessToken: current,
        merchantId: session.integration.merchantId,
        apiUrl: session.integration.digitalMenuUrl,
        ...(linvoRefreshToken ? { refreshToken: linvoRefreshToken } : {}),
      });
      if (next.expiresAt.getTime() <= now.getTime()) {
        await this.markNeedsReauth(
          session.id,
          'O parceiro devolveu um token que já estava vencido',
        );
        return;
      }

      await this.prisma.integrationSession.update({
        where: { id: session.id },
        data: {
          accessTokenEnc: this.cipher.encrypt(next.accessToken),
          expiresAt: next.expiresAt,
          refreshAfter: scheduleNextRefresh(next.expiresAt, next.refreshAfter, now),
          status: IntegrationSessionStatus.ACTIVE,
          lockedUntil: null,
          lastRefreshedAt: now,
          lastError: null,
        },
      });
      await this.prisma.digitalMenuIntegration.update({
        where: { id: session.integrationId },
        data: {
          apiKey: next.accessToken,
          ...(next.refreshToken ? { apiSecret: next.refreshToken } : {}),
        },
      });
      this.logger.log(
        `Sessão ${session.partnerSlug} renovada para a empresa ${session.companyId}`,
      );
    } catch (error) {
      const failure =
        error instanceof SessionRefreshError
          ? error
          : new SessionRefreshError(
              error instanceof Error ? error.message : String(error),
              'transient',
            );

      if (failure.kind === 'rejected') {
        await this.markNeedsReauth(session.id, failure.message);
        this.logger.warn(
          `Sessão ${session.partnerSlug} da empresa ${session.companyId} precisa de um token novo: ${failure.message}`,
        );
        return;
      }

      await this.prisma.integrationSession.update({
        where: { id: session.id },
        data: {
          lockedUntil: null,
          refreshAfter: new Date(now.getTime() + SESSION_REFRESH_BACKOFF_MS),
          lastError: clipError(failure.message),
        },
      });
      this.logger.warn(
        `Renovação ${session.partnerSlug} da empresa ${session.companyId} adiada: ${failure.message}`,
      );
    }
  }

  async markReauth(integrationId: string, message: string): Promise<void> {
    const row = await this.prisma.integrationSession.findUnique({
      where: { integrationId },
      select: { id: true },
    });
    if (!row) return;
    await this.markNeedsReauth(row.id, message);
  }

  private async markNeedsReauth(id: string, message: string): Promise<void> {
    await this.prisma.integrationSession.update({
      where: { id },
      data: {
        status: IntegrationSessionStatus.NEEDS_REAUTH,
        lockedUntil: null,
        lastError: clipError(message),
      },
    });
  }
}

function scheduleNextRefresh(
  expiresAt: Date,
  requested: Date | undefined,
  now: Date,
): Date {
  if (
    requested &&
    requested.getTime() > now.getTime() &&
    requested.getTime() < expiresAt.getTime()
  ) {
    return requested;
  }
  return refreshAfterFor(expiresAt, now);
}
