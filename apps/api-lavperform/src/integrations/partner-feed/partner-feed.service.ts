import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderIngestionService } from '../../public-api/orders/application/order-ingestion.service';
import { IngestOrderDto } from '../../public-api/orders/application/dto/ingest-order.dto';
import { IntegrationSessionService } from '../session-refresh/integration-session.service';
import { SessionRefreshError } from '../session-refresh/session-refresh.error';
import { PartnerSalesClient } from './partner-sales.client';

/**
 * Parceiros do app de integrações que ainda não tinham importação na API.
 * MaxLav continua no fluxo próprio, que já lê o token da sessão.
 */
export const SESSION_FEED_PARTNERS = ['LAUNDRYKIT', 'SISLAV'] as const;

interface FeedIntegration {
  id: string;
  companyId: string;
  apiKey: string | null;
  apiSecret: string | null;
  merchantId: string | null;
  digitalMenuUrl: string | null;
  partner: { id: string; partnerSlug: string | null; name: string } | null;
}

@Injectable()
export class PartnerFeedService {
  private readonly logger = new Logger(PartnerFeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sessions: IntegrationSessionService,
    private readonly sales: PartnerSalesClient,
    private readonly ingestion: OrderIngestionService,
  ) {}

  async feedDue(now = new Date()): Promise<void> {
    const dates = [brtDate(now), brtDate(new Date(now.getTime() - 24 * 60 * 60 * 1000))];
    const integrations = await this.prisma.digitalMenuIntegration.findMany({
      where: {
        active: true,
        partner: { partnerSlug: { in: [...SESSION_FEED_PARTNERS] } },
        company: { state: 'ACTIVE', deletedAt: null },
      },
      include: {
        partner: { select: { id: true, partnerSlug: true, name: true } },
      },
    });

    for (const integration of integrations) {
      for (const date of dates) {
        await this.feedOne(integration, date);
      }
    }
  }

  private async feedOne(integration: FeedIntegration, date: string): Promise<void> {
    const partnerSlug = integration.partner?.partnerSlug;
    if (!partnerSlug) return;

    const token = await this.sessions.currentAccessToken(
      integration.id,
      integration.apiKey,
    );
    if (!token) {
      this.logger.warn(
        `Sessão ${partnerSlug} indisponível para a empresa ${integration.companyId}`,
      );
      return;
    }

    let orders: IngestOrderDto[];
    try {
      orders = await this.sales.salesOfDay({
        partnerSlug,
        accessToken: token,
        date,
        merchantId: integration.merchantId,
        organizationId: integration.apiSecret,
        apiUrl: integration.digitalMenuUrl,
      });
    } catch (error) {
      if (error instanceof SessionRefreshError && error.kind === 'rejected') {
        await this.sessions.markReauth(integration.id, error.message);
      }
      this.logger.warn(
        `Falha ao consultar ${partnerSlug} em ${date} para a empresa ${integration.companyId}: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
      return;
    }

    for (const order of orders) {
      if (!order.customer?.phone && !order.customer?.cpf) continue;
      const payload = integration.partner
        ? { ...order, partnerId: integration.partner.id }
        : order;
      try {
        await this.ingestion.enqueue(
          { apiKeyId: 'partner-session-feed', companyId: integration.companyId },
          payload,
        );
      } catch (error) {
        this.logger.warn(
          `Falha ao enfileirar ${order.externalOrderId} (${partnerSlug}): ${
            error instanceof Error ? error.message : String(error)
          }`,
        );
      }
    }
  }
}

function brtDate(now: Date): string {
  return new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString().slice(0, 10);
}
