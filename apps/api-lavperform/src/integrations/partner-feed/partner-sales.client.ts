import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { IngestOrderDto } from '../../public-api/orders/application/dto/ingest-order.dto';
import { SessionRefreshError } from '../session-refresh/session-refresh.error';

export interface PartnerSalesRequest {
  partnerSlug: string;
  accessToken: string;
  date: string;
  merchantId?: string | null;
  organizationId?: string | null;
  apiUrl?: string | null;
}

@Injectable()
export class PartnerSalesClient {
  constructor(private readonly httpService: HttpService) {}

  async salesOfDay(input: PartnerSalesRequest): Promise<IngestOrderDto[]> {
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
          `${baseUrl}/api/partners/sales`,
          {
            partner: input.partnerSlug.toLowerCase(),
            accessToken: input.accessToken,
            date: input.date,
            merchantId: input.merchantId || undefined,
            organizationId: input.organizationId || undefined,
            apiUrl: input.apiUrl || undefined,
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
        readError(body, 'O parceiro recusou o token'),
        'rejected',
      );
    }
    if (status < 200 || status >= 300) {
      throw new SessionRefreshError(
        readError(body, `Motor de integrações respondeu HTTP ${status}`),
        'transient',
      );
    }

    if (typeof body !== 'object' || body === null || !('orders' in body)) {
      throw new SessionRefreshError(
        'Motor de integrações devolveu vendas sem a lista de pedidos',
        'transient',
      );
    }
    const orders = (body as { orders?: unknown }).orders;
    if (!Array.isArray(orders)) {
      throw new SessionRefreshError(
        'Motor de integrações devolveu vendas sem a lista de pedidos',
        'transient',
      );
    }
    return orders as IngestOrderDto[];
  }
}

function readError(body: unknown, fallback: string): string {
  if (typeof body === 'object' && body !== null && 'error' in body) {
    const error = (body as { error?: unknown }).error;
    if (typeof error === 'string' && error.trim()) return error;
  }
  return fallback;
}
