import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { SALE_ATTRIBUTION_JOB_NAME } from '../listeners/order-created-attribution.listener';

type IncentivizedSalesTotalRow = {
  totalValue: number;
  totalCount: number;
};

@Injectable()
export class SaleAttributionService {
  private readonly logger = new Logger(SaleAttributionService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.SALE_CAMPAIGN_ATTRIBUTION)
    private readonly attributionQueue: Queue,
  ) {}

  async getIncentivizedSalesTotal(
    companyId: string,
  ): Promise<{ totalValue: number; totalCount: number }> {
    const rows = await this.prisma.$queryRaw<IncentivizedSalesTotalRow[]>(
      Prisma.sql`
        WITH attributed_orders_by_campaign AS (
          SELECT DISTINCT
            COALESCE(m."campaignId", m."automaticCampaignId") AS "campaignId",
            mo."orderId",
            o.total
          FROM "MessageOrder" mo
          INNER JOIN "Message" m ON m.id = mo."messageId"
          INNER JOIN "Order" o ON o.id = mo."orderId"
          WHERE m."companyId" = ${companyId}
            AND (m."campaignId" IS NOT NULL OR m."automaticCampaignId" IS NOT NULL)
        )
        SELECT
          COALESCE(SUM(total), 0)::float AS "totalValue",
          COUNT(*)::int AS "totalCount"
        FROM attributed_orders_by_campaign
      `,
    );
    const total = rows[0] ?? { totalValue: 0, totalCount: 0 };

    return {
      totalValue: Number(total.totalValue),
      totalCount: Number(total.totalCount),
    };
  }

  async reprocessByDateRange(
    companyId: string,
    startDate: Date,
    endDate: Date,
  ): Promise<{ enqueued: number }> {
    const orders = await this.prisma.order.findMany({
      where: {
        companyId,
        createdAt: { gte: startDate, lte: endDate },
      },
      select: { id: true, customerId: true, companyId: true },
    });

    if (orders.length === 0) {
      this.logger.log(
        `Nenhum pedido encontrado para empresa ${companyId} no intervalo de datas`,
      );
      return { enqueued: 0 };
    }

    const jobs = orders.map((order) => ({
      name: SALE_ATTRIBUTION_JOB_NAME,
      data: {
        orderId: order.id,
        customerId: order.customerId,
        companyId: order.companyId,
      },
      opts: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }));

    await this.attributionQueue.addBulk(jobs);

    this.logger.log(
      `${orders.length} pedidos enfileirados para reprocessamento de atribuição (empresa ${companyId})`,
    );

    return { enqueued: orders.length };
  }
}
