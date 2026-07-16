import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IDashboardRepository } from '../../domain/dashboard.repository.interface';
import { DailyMetricsEntity } from '../../domain/daily-metrics.entity';
import { CampaignSummaryEntity } from '../../domain/dashboard-summary.entity';
import { MessageStatus, Prisma } from '@prisma/client';
import { ResolvedDateRange } from '../../../common/dto/date-range-filter.dto';
import { MessageCostService } from '../../../message-engine/pricing/message-cost.service';

type DailyMetricsRaw = {
  day: string;
  messages: number;
  clicks: number;
  sales: number;
};

type CampaignSalesSummaryRaw = {
  salesTotalQuantity: number;
  salesTotalAmount: number;
};

type MessageCostGroupRaw = {
  channel: string;
  category: string | null;
  count: number;
};

@Injectable()
export class PrismaDashboardRepository implements IDashboardRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly messageCost: MessageCostService,
  ) {}

  async getCampaignsSummary(
    companyId: string,
    range: ResolvedDateRange,
  ): Promise<CampaignSummaryEntity> {
    const { startDate, endDate } = range;

    const [messagesSent, salesSummaryRows, costGroupRows] = await Promise.all([
      this.prisma.message.count({
        where: {
          companyId: companyId,
          status: MessageStatus.SENT,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.$queryRaw<CampaignSalesSummaryRaw[]>(
        Prisma.sql`
          SELECT
            COUNT("orderId")::int AS "salesTotalQuantity",
            COALESCE(SUM(total), 0)::float AS "salesTotalAmount"
          FROM (
            SELECT DISTINCT mo."orderId", o.total
            FROM "MessageOrder" mo
            INNER JOIN "Message" m ON m.id = mo."messageId"
            INNER JOIN "Order" o ON o.id = mo."orderId"
            WHERE m."companyId" = ${companyId}
              AND m."createdAt" >= ${startDate}
              AND m."createdAt" <= ${endDate}
          ) attributed_orders
        `
      ),
      this.prisma.$queryRaw<MessageCostGroupRaw[]>(
        Prisma.sql`
          SELECT
            m."channel"::text AS channel,
            t."category"::text AS category,
            COUNT(*)::int AS count
          FROM "Message" m
          LEFT JOIN "meta_message_templates" t ON t.id = m."metaMessageTemplateId"
          WHERE m."companyId" = ${companyId}
            AND m."status" = 'SENT'
            AND m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
          GROUP BY 1, 2
        `
      ),
    ]);

    const costGroups = costGroupRows.map((row) => ({
      channel: row.channel,
      category: row.category,
      count: Number(row.count),
    }));
    const totalCost = this.messageCost.totalCostBRL(costGroups);
    const messageTypeBreakdown = this.messageCost.buildBreakdown(costGroups);

    const salesSummary = salesSummaryRows[0] ?? {
      salesTotalQuantity: 0,
      salesTotalAmount: 0,
    };
    const conversionRate = messagesSent > 0
      ? (Number(salesSummary.salesTotalQuantity) / messagesSent) * 100
      : 0;
    const salesTotalQuantity = Number(salesSummary.salesTotalQuantity);
    const salesTotalAmount = Number(salesSummary.salesTotalAmount);

    return new CampaignSummaryEntity(
      messagesSent,
      conversionRate,
      salesTotalQuantity,
      salesTotalAmount,
      0, // totalCustomers placeholder as in original service
      totalCost,
      messageTypeBreakdown,
    );
  }

  async getDailyMessageMetrics(
    companyId: string,
    range: ResolvedDateRange,
  ): Promise<DailyMetricsEntity[]> {
    const { startDate, endDate, timeZone } = range;

    const messagesSentByDate = await this.prisma.$queryRaw<DailyMetricsRaw[]>(
      Prisma.sql`
          WITH bounds AS (
            SELECT
              ${startDate}::timestamp AS start_ts,
              ${endDate}::timestamp AS end_ts,
              ${timeZone}::text AS tz
          ),
          day_series AS (
            SELECT generate_series(
                    DATE((SELECT start_ts FROM bounds) AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)),
                    DATE((SELECT end_ts   FROM bounds) AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)),
                    INTERVAL '1 day'
                  )::date AS day
          ),
          counts AS (
            SELECT DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day, COUNT(*)::int AS messages
            FROM "Message"
            WHERE "companyId" = ${companyId}
              AND "createdAt" >= (SELECT start_ts FROM bounds)
              AND "createdAt" <= (SELECT end_ts FROM bounds)
              AND "status" = 'SENT'
            GROUP BY 1
          ),
          clicks AS (
            SELECT DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day, COUNT(DISTINCT mi."messageId")::int AS clicks
            FROM "Message" m
            INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
            WHERE m."companyId" = ${companyId}
              AND m."createdAt" >= (SELECT start_ts FROM bounds)
              AND m."createdAt" <= (SELECT end_ts FROM bounds)
            GROUP BY 1
          ),
          sales AS (
            SELECT day, COUNT("orderId")::int AS sales
            FROM (
              SELECT DISTINCT
                DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
                mo."orderId"
              FROM "Message" m
              INNER JOIN "MessageOrder" mo ON mo."messageId" = m.id
              WHERE m."companyId" = ${companyId}
                AND m."createdAt" >= (SELECT start_ts FROM bounds)
                AND m."createdAt" <= (SELECT end_ts FROM bounds)
            ) attributed_orders
            GROUP BY 1
          )
          SELECT
            ds.day,
            COALESCE(c.messages, 0) AS messages,
            COALESCE(c2.clicks,  0) AS clicks,
            COALESCE(c3.sales,   0) AS sales
          FROM day_series ds
          LEFT JOIN counts c USING (day)
          LEFT JOIN clicks c2 USING (day)
          LEFT JOIN sales  c3 USING (day)
          ORDER BY ds.day;
        `
    );

    return messagesSentByDate.map(item => {
      const day = new Date(item.day)
        .toLocaleString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
        .replace(' de ', ' ');

      return new DailyMetricsEntity(
        day,
        Number(item.messages),
        Number(item.clicks),
        Number(item.sales),
      );
    });
  }
}
