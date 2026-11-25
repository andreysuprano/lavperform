import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { SessionRefreshError } from './session-refresh.error';

export interface RefreshedPartnerSession {
  accessToken: string;
  expiresAt: Date;
  refreshAfter?: Date;
  refreshToken?: string;
}

@Injectable()
export class IntegrationsEngineSessionClient {
  constructor(private readonly httpService: HttpService) {}

  async refresh(input: {
    partnerSlug: string;
    accessToken: string;
    merchantId?: string | null;
    apiUrl?: string | null;
    refreshToken?: string | null;
  }): Promise<RefreshedPartnerSession> {
    const baseUrl = (
      process.env.INTEGRATIONS_ENGINE_URL ??
      process.env.CICCLO_API_URL ??
      ''
    ).replace(/\/$/, '');

    if (!baseUrl) {
      throw new SessionRefreshError(
        'INTEGRATIONS_ENGINE_URL não configurada',
        'transient',
      );
    }

    let status = 0;
    let body: unknown;
    try {
      const response = await firstValueFrom(
        this.httpService.post(
          `${baseUrl}/api/sessions/refresh`,
          {
            partner: input.partnerSlug.toLowerCase(),
            accessToken: input.accessToken,
            merchantId: input.merchantId || undefined,
            apiUrl: input.apiUrl || undefined,
            refreshToken: input.refreshToken || undefined,
          },
          {
            headers: {
              accept: 'application/json',
              'Content-Type': 'application/json',
            },
            validateStatus: () => true,
          },
        ),
      );
      status = response.status;
      body = response.data;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      throw new SessionRefreshError(
        `Motor de integrações indisponível: ${message}`,
        'transient',
      );
    }

    if (status === 401) {
      throw new SessionRefreshError(
        readErrorMessage(body, 'O parceiro recusou o token'),
        'rejected',
      );
    }

    if (status === 422) {
      throw new SessionRefreshError(
        readErrorMessage(body, 'Renovação indisponível para este parceiro'),
        'unavailable',
      );
    }

    if (status < 200 || status >= 300) {
      throw new SessionRefreshError(
        readErrorMessage(body, `Motor de integrações respondeu HTTP ${status}`),
        'transient',
      );
    }

    const parsed = readRefreshedSession(body);
    if (!parsed) {
      throw new SessionRefreshError(
        'Motor de integrações devolveu uma sessão sem token ou validade',
        'transient',
      );
    }
    return parsed;
  }
}

function readErrorMessage(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}

function readRefreshedSession(body: unknown): RefreshedPartnerSession | null {
  if (typeof body !== 'object' || body === null) return null;
  const record = body as {
    accessToken?: unknown;
    expiresAt?: unknown;
    refreshAfter?: unknown;
    refreshToken?: unknown;
  };
  if (typeof record.accessToken !== 'string' || !record.accessToken.trim()) {
    return null;
  }
  if (typeof record.expiresAt !== 'string') return null;
  const expiresAt = new Date(record.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) return null;

  let refreshAfter: Date | undefined;
  if (typeof record.refreshAfter === 'string') {
    const parsed = new Date(record.refreshAfter);
    if (!Number.isNaN(parsed.getTime())) refreshAfter = parsed;
  }
  const refreshToken =
    typeof record.refreshToken === 'string' && record.refreshToken.trim()
      ? record.refreshToken.trim()
      : undefined;
  return {
    accessToken: record.accessToken.trim(),
    expiresAt,
    refreshAfter,
    refreshToken,
  };
}
