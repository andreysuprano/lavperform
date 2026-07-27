import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IDashboardRepository } from '../../domain/dashboard.repository.interface';
import { DailyMetricsEntity } from '../../domain/daily-metrics.entity';
import {
  CampaignSummaryEntity,
  TopCampaignSummary,
} from '../../domain/dashboard-summary.entity';
import { MessageStatus, Prisma } from '@prisma/client';
import { ResolvedDateRange } from '../../../common/dto/date-range-filter.dto';
import { MessageCostService } from '../../../message-engine/pricing/message-cost.service';

type DailyMetricsRaw = {
  day: string;
  messages: number;
  clicks: number;
  sales: number;
  errors: number;
  salesAmount: number;
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

type InteractionsRaw = {
  interactions: number;
};

type TopCampaignRaw = {
  id: string;
  name: string;
  messagesSent: number;
  interactions: number;
  salesTotalQuantity: number;
  salesTotalAmount: number;
  channel: string;
  category: string | null;
  costCount: number;
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

    const [
      messagesSent,
      messagesError,
      interactionsRows,
      salesSummaryRows,
      costGroupRows,
    ] = await Promise.all([
      this.prisma.message.count({
        where: {
          companyId,
          status: MessageStatus.SENT,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.message.count({
        where: {
          companyId,
          status: MessageStatus.ERROR,
          createdAt: {
            gte: startDate,
            lte: endDate,
          },
        },
      }),
      this.prisma.$queryRaw<InteractionsRaw[]>(
        Prisma.sql`
          SELECT COUNT(DISTINCT mi."messageId")::int AS interactions
          FROM "Message" m
          INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
          WHERE m."companyId" = ${companyId}
            AND m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
        `,
      ),
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
        `,
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
        `,
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
    const salesTotalQuantity = Number(salesSummary.salesTotalQuantity);
    const salesTotalAmount = Number(salesSummary.salesTotalAmount);
    const interactions = Number(interactionsRows[0]?.interactions ?? 0);

    const conversionRate =
      messagesSent > 0 ? (salesTotalQuantity / messagesSent) * 100 : 0;
    const ctr = messagesSent > 0 ? (interactions / messagesSent) * 100 : 0;
    const clickToSaleRate =
      interactions > 0 ? (salesTotalQuantity / interactions) * 100 : 0;
    const averageTicket =
      salesTotalQuantity > 0 ? salesTotalAmount / salesTotalQuantity : 0;
    const attempted = messagesSent + messagesError;
    const errorRate = attempted > 0 ? (messagesError / attempted) * 100 : 0;

    return new CampaignSummaryEntity(
      messagesSent,
      conversionRate,
      salesTotalQuantity,
      salesTotalAmount,
      0,
      totalCost,
      messageTypeBreakdown,
      interactions,
      messagesError,
      ctr,
      clickToSaleRate,
      averageTicket,
      errorRate,
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
            SELECT
              DATE("createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
              COUNT(CASE WHEN "status" = 'SENT' THEN 1 END)::int AS messages,
              COUNT(CASE WHEN "status" = 'ERROR' THEN 1 END)::int AS errors
            FROM "Message"
            WHERE "companyId" = ${companyId}
              AND "createdAt" >= (SELECT start_ts FROM bounds)
              AND "createdAt" <= (SELECT end_ts FROM bounds)
            GROUP BY 1
          ),
          clicks AS (
            SELECT
              DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
              COUNT(DISTINCT mi."messageId")::int AS clicks
            FROM "Message" m
            INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
            WHERE m."companyId" = ${companyId}
              AND m."createdAt" >= (SELECT start_ts FROM bounds)
              AND m."createdAt" <= (SELECT end_ts FROM bounds)
            GROUP BY 1
          ),
          sales AS (
            SELECT day, COUNT("orderId")::int AS sales, COALESCE(SUM(total), 0)::float AS "salesAmount"
            FROM (
              SELECT DISTINCT
                DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
                mo."orderId",
                o.total
              FROM "Message" m
              INNER JOIN "MessageOrder" mo ON mo."messageId" = m.id
              INNER JOIN "Order" o ON o.id = mo."orderId"
              WHERE m."companyId" = ${companyId}
                AND m."createdAt" >= (SELECT start_ts FROM bounds)
                AND m."createdAt" <= (SELECT end_ts FROM bounds)
            ) attributed_orders
            GROUP BY 1
          )
          SELECT
            ds.day,
            COALESCE(c.messages, 0) AS messages,
            COALESCE(c.errors, 0) AS errors,
            COALESCE(c2.clicks,  0) AS clicks,
            COALESCE(c3.sales,   0) AS sales,
            COALESCE(c3."salesAmount", 0) AS "salesAmount"
          FROM day_series ds
          LEFT JOIN counts c USING (day)
          LEFT JOIN clicks c2 USING (day)
          LEFT JOIN sales  c3 USING (day)
          ORDER BY ds.day;
        `,
    );

    return messagesSentByDate.map(
      (item) => {
        const day = new Date(item.day)
          .toLocaleString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
          .replace(' de ', ' ');

        return new DailyMetricsEntity(
          day,
          Number(item.messages),
          Number(item.clicks),
          Number(item.sales),
          Number(item.errors),
          Number(item.salesAmount),
        );
      },
    );
  }

  async getTopCampaigns(
    companyId: string,
    range: ResolvedDateRange,
    limit = 5,
  ): Promise<TopCampaignSummary[]> {
    const { startDate, endDate } = range;

    const rows = await this.prisma.$queryRaw<TopCampaignRaw[]>(
      Prisma.sql`
        WITH sent AS (
          SELECT
            m."automaticCampaignId" AS id,
            COUNT(*)::int AS "messagesSent"
          FROM "Message" m
          WHERE m."companyId" = ${companyId}
            AND m."automaticCampaignId" IS NOT NULL
            AND m."status" = 'SENT'
            AND m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
          GROUP BY m."automaticCampaignId"
        ),
        interactions AS (
          SELECT
            m."automaticCampaignId" AS id,
            COUNT(DISTINCT mi."messageId")::int AS interactions
          FROM "Message" m
          INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
          WHERE m."companyId" = ${companyId}
            AND m."automaticCampaignId" IS NOT NULL
            AND m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
          GROUP BY m."automaticCampaignId"
        ),
        sales AS (
          SELECT
            id,
            COUNT("orderId")::int AS "salesTotalQuantity",
            COALESCE(SUM(total), 0)::float AS "salesTotalAmount"
          FROM (
            SELECT DISTINCT
              m."automaticCampaignId" AS id,
              mo."orderId",
              o.total
            FROM "Message" m
            INNER JOIN "MessageOrder" mo ON mo."messageId" = m.id
            INNER JOIN "Order" o ON o.id = mo."orderId"
            WHERE m."companyId" = ${companyId}
              AND m."automaticCampaignId" IS NOT NULL
              AND m."createdAt" >= ${startDate}
              AND m."createdAt" <= ${endDate}
          ) attributed
          GROUP BY id
        ),
        cost_groups AS (
          SELECT
            m."automaticCampaignId" AS id,
            m."channel"::text AS channel,
            t."category"::text AS category,
            COUNT(*)::int AS "costCount"
          FROM "Message" m
          LEFT JOIN "meta_message_templates" t ON t.id = m."metaMessageTemplateId"
          WHERE m."companyId" = ${companyId}
            AND m."automaticCampaignId" IS NOT NULL
            AND m."status" = 'SENT'
            AND m."createdAt" >= ${startDate}
            AND m."createdAt" <= ${endDate}
          GROUP BY m."automaticCampaignId", m."channel", t."category"
        )
        SELECT
          ac.id,
          ac.name,
          COALESCE(s."messagesSent", 0) AS "messagesSent",
          COALESCE(i.interactions, 0) AS interactions,
          COALESCE(sa."salesTotalQuantity", 0) AS "salesTotalQuantity",
          COALESCE(sa."salesTotalAmount", 0) AS "salesTotalAmount",
          cg.channel,
          cg.category,
          COALESCE(cg."costCount", 0) AS "costCount"
        FROM "AutomaticCampaign" ac
        INNER JOIN sent s ON s.id = ac.id
        LEFT JOIN interactions i ON i.id = ac.id
        LEFT JOIN sales sa ON sa.id = ac.id
        LEFT JOIN cost_groups cg ON cg.id = ac.id
        WHERE ac."companyId" = ${companyId}
          AND ac."deletedAt" IS NULL
          AND s."messagesSent" > 0
      `,
    );

    // Aggregate cost groups per campaign (query returns one row per channel/category)
    const byCampaign = new Map<
      string,
      {
        id: string;
        name: string;
        messagesSent: number;
        interactions: number;
        salesTotalQuantity: number;
        salesTotalAmount: number;
        costGroups: Array<{ channel: string; category: string | null; count: number }>;
      }
    >();

    for (const row of rows) {
      const existing = byCampaign.get(row.id);
      if (!existing) {
        byCampaign.set(row.id, {
          id: row.id,
          name: row.name,
          messagesSent: Number(row.messagesSent),
          interactions: Number(row.interactions),
          salesTotalQuantity: Number(row.salesTotalQuantity),
          salesTotalAmount: Number(row.salesTotalAmount),
          costGroups:
            row.channel != null
              ? [
                  {
                    channel: row.channel,
                    category: row.category,
                    count: Number(row.costCount),
                  },
                ]
              : [],
        });
      } else if (row.channel != null) {
        existing.costGroups.push({
          channel: row.channel,
          category: row.category,
          count: Number(row.costCount),
        });
      }
    }

    const ranked: TopCampaignSummary[] = Array.from(byCampaign.values()).map((campaign) => {
      const totalCost = this.messageCost.totalCostBRL(campaign.costGroups);
      const ctr =
        campaign.messagesSent > 0
          ? (campaign.interactions / campaign.messagesSent) * 100
          : 0;
      const conversionRate =
        campaign.messagesSent > 0
          ? (campaign.salesTotalQuantity / campaign.messagesSent) * 100
          : 0;
      const roi = totalCost > 0 ? campaign.salesTotalAmount / totalCost : null;

      return {
        id: campaign.id,
        name: campaign.name,
        messagesSent: campaign.messagesSent,
        interactions: campaign.interactions,
        salesTotalQuantity: campaign.salesTotalQuantity,
        salesTotalAmount: campaign.salesTotalAmount,
        totalCost,
        ctr,
        conversionRate,
        roi,
      };
    });

    ranked.sort((a, b) => {
      if (b.salesTotalAmount !== a.salesTotalAmount) {
        return b.salesTotalAmount - a.salesTotalAmount;
      }
      const roiA = a.roi ?? -1;
      const roiB = b.roi ?? -1;
      return roiB - roiA;
    });

    return ranked.slice(0, limit);
  }
}
