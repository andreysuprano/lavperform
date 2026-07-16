import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { IAutomaticCampaignRepository } from '../../domain/automatic-campaign.repository.interface';
import { AutomaticCampaign } from '../../domain/automatic-campaign.entity';
import { AutomaticCampaignMapper } from './mappers/automatic-campaign.mapper';
import { AutomaticCampaignFilterDto } from '../../application/dto/automatic-campaign-filter.dto';
import { PaginationDto } from 'src/common/dto/pagination.dto';
import { ResolvedDateRange } from 'src/common/dto/date-range-filter.dto';
import { ResolvedCampaignMessagesFilter } from '../../application/dto/campaign-messages-filter.dto';
import { Prisma } from '@prisma/client';
import { MessageCostService } from '../../../message-engine/pricing/message-cost.service';

type DailyMetrics = {
    day: string;
    messages: number;
    errors: number;
    clicks: number;
    sales: number;
    salesAmount: number;
};

type CampaignMetricFromMessages = {
    campaignId: string;
    messagesSent: number;
    messagesError: number;
    interactions: number;
    salesTotalQuantity: number;
    salesTotalAmount: number;
};

type MessageCostGroupRow = {
    campaignId: string;
    channel: string;
    category: string | null;
    count: number;
};

@Injectable()
export class AutomaticCampaignPrismaRepository implements IAutomaticCampaignRepository {
    constructor(
        private readonly prisma: PrismaService,
        private readonly messageCost: MessageCostService,
    ) { }

    private buildMetricFromMessages(
        metric: CampaignMetricFromMessages,
        originalMetric?: any,
        costGroups: { channel: string; category: string | null; count: number }[] = [],
    ) {
        const messagesSent = Number(metric.messagesSent);
        const salesTotalQuantity = Number(metric.salesTotalQuantity);

        return {
            ...(originalMetric ?? {}),
            messagesSent,
            messagesError: Number(metric.messagesError),
            interactions: Number(metric.interactions),
            salesTotalQuantity,
            salesTotalAmount: Number(metric.salesTotalAmount),
            messagesDelivered: 0,
            conversionRate: messagesSent > 0
                ? (salesTotalQuantity / messagesSent) * 100
                : 0,
            totalCost: this.messageCost.totalCostBRL(costGroups),
            messageTypeBreakdown: this.messageCost.buildBreakdown(costGroups),
        };
    }

    private async getCostGroupsByCampaign(
        campaignIds: string[],
    ): Promise<Map<string, { channel: string; category: string | null; count: number }[]>> {
        if (campaignIds.length === 0) {
            return new Map();
        }

        const rows = await this.prisma.$queryRaw<MessageCostGroupRow[]>(
            Prisma.sql`
                SELECT
                    m."automaticCampaignId" AS "campaignId",
                    m."channel"::text AS channel,
                    t."category"::text AS category,
                    COUNT(*)::int AS count
                FROM "Message" m
                LEFT JOIN "meta_message_templates" t ON t.id = m."metaMessageTemplateId"
                WHERE m."automaticCampaignId" IN (${Prisma.join(campaignIds)})
                    AND m."status" = 'SENT'
                GROUP BY 1, 2, 3
            `
        );

        const map = new Map<string, { channel: string; category: string | null; count: number }[]>();
        for (const row of rows) {
            const groups = map.get(row.campaignId) ?? [];
            groups.push({ channel: row.channel, category: row.category, count: Number(row.count) });
            map.set(row.campaignId, groups);
        }
        return map;
    }

    private async getMetricsFromMessages(campaignIds: string[]) {
        if (campaignIds.length === 0) {
            return new Map<string, CampaignMetricFromMessages>();
        }

        const rows = await this.prisma.$queryRaw<CampaignMetricFromMessages[]>(
            Prisma.sql`
                WITH selected_campaigns AS (
                    SELECT unnest(ARRAY[${Prisma.join(campaignIds)}]::text[]) AS id
                ),
                message_counts AS (
                    SELECT
                        m."automaticCampaignId" AS "campaignId",
                        COUNT(CASE WHEN m."status" = 'SENT' THEN 1 END)::int AS "messagesSent",
                        COUNT(CASE WHEN m."status" = 'ERROR' THEN 1 END)::int AS "messagesError"
                    FROM "Message" m
                    WHERE m."automaticCampaignId" IN (SELECT id FROM selected_campaigns)
                    GROUP BY 1
                ),
                click_counts AS (
                    SELECT
                        m."automaticCampaignId" AS "campaignId",
                        COUNT(DISTINCT mi."messageId")::int AS interactions
                    FROM "Message" m
                    INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
                    WHERE m."automaticCampaignId" IN (SELECT id FROM selected_campaigns)
                    GROUP BY 1
                ),
                attributed_orders AS (
                    SELECT DISTINCT
                        m."automaticCampaignId" AS "campaignId",
                        mo."orderId",
                        o.total
                    FROM "Message" m
                    INNER JOIN "MessageOrder" mo ON mo."messageId" = m.id
                    INNER JOIN "Order" o ON o.id = mo."orderId"
                    WHERE m."automaticCampaignId" IN (SELECT id FROM selected_campaigns)
                ),
                sales_counts AS (
                    SELECT
                        "campaignId",
                        COUNT("orderId")::int AS "salesTotalQuantity",
                        COALESCE(SUM(total), 0)::float AS "salesTotalAmount"
                    FROM attributed_orders
                    GROUP BY 1
                )
                SELECT
                    sc.id AS "campaignId",
                    COALESCE(mc."messagesSent", 0) AS "messagesSent",
                    COALESCE(mc."messagesError", 0) AS "messagesError",
                    COALESCE(cc.interactions, 0) AS interactions,
                    COALESCE(sales."salesTotalQuantity", 0) AS "salesTotalQuantity",
                    COALESCE(sales."salesTotalAmount", 0) AS "salesTotalAmount"
                FROM selected_campaigns sc
                LEFT JOIN message_counts mc ON mc."campaignId" = sc.id
                LEFT JOIN click_counts cc ON cc."campaignId" = sc.id
                LEFT JOIN sales_counts sales ON sales."campaignId" = sc.id
            `
        );

        return new Map(rows.map((row) => [row.campaignId, row]));
    }

    async create(data: Partial<AutomaticCampaign>): Promise<AutomaticCampaign> {
        const created = await this.prisma.automaticCampaign.create({ data: data as any });
        return AutomaticCampaignMapper.toDomain(created);
    }

    async createWithRelations(data: Partial<AutomaticCampaign>, gifts?: any[], creatives?: any[]): Promise<AutomaticCampaign> {
        const created = await this.prisma.$transaction(async (prisma) => {
            const createdCampaign = await prisma.automaticCampaign.create({
                data: {
                    ...data as any,
                    gifts: gifts ? { create: gifts } : undefined,
                    creatives: creatives && creatives.length > 0 ? { create: creatives } : undefined,
                },
                include: {
                    gifts: true,
                    creatives: true,
                    coupon: true,
                    campaignMetric: true,
                    company: { select: { id: true, name: true } },
                },
            });

            await prisma.campaignMetric.create({
                data: { automaticCampaignId: createdCampaign.id },
            });

            return createdCampaign;
        });
        return AutomaticCampaignMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<AutomaticCampaign[]> {
        const result = await this.prisma.automaticCampaign.findMany({ where: options });
        return result.map(AutomaticCampaignMapper.toDomain);
    }

    async findAllWithFilters(companyId: string, paginationDto: PaginationDto, filterDto: AutomaticCampaignFilterDto): Promise<{ items: AutomaticCampaign[]; total: number }> {
        const { page = 1, limit = 10, orderBy = 'createdAt', orderDirection = 'desc' } = paginationDto;
        const { startDate, endDate, active, type } = filterDto;
        const skip = (page - 1) * limit;

        const where: any = {
            companyId,
            deletedAt: null,
            ...(startDate && { startDate: { gte: startDate } }),
            ...(endDate && { endDate: { lte: endDate } }),
            ...(active !== undefined && { active }),
            ...(type && { type }),
        };

        const [campaigns, total] = await Promise.all([
            this.prisma.automaticCampaign.findMany({
                where,
                skip,
                take: limit,
                orderBy: { [orderBy]: orderDirection },
                include: {
                    gifts: true,
                    creatives: true,
                    coupon: true,
                    campaignMetric: true,
                    company: { select: { id: true, name: true } },
                    _count: { select: { messages: true } }
                },
            }),
            this.prisma.automaticCampaign.count({ where }),
        ]);

        const campaignIds = campaigns.map((campaign) => campaign.id);
        const [metricsByCampaignId, costGroupsByCampaignId] = await Promise.all([
            this.getMetricsFromMessages(campaignIds),
            this.getCostGroupsByCampaign(campaignIds),
        ]);
        const campaignsWithMessageMetrics = campaigns.map((campaign) => ({
            ...campaign,
            campaignMetric: [
                this.buildMetricFromMessages(
                    metricsByCampaignId.get(campaign.id) ?? {
                        campaignId: campaign.id,
                        messagesSent: 0,
                        messagesError: 0,
                        interactions: 0,
                        salesTotalQuantity: 0,
                        salesTotalAmount: 0,
                    },
                    campaign.campaignMetric?.[0],
                    costGroupsByCampaignId.get(campaign.id) ?? [],
                ),
            ],
        }));

        return {
            items: campaignsWithMessageMetrics.map(AutomaticCampaignMapper.toDomain),
            total
        };
    }

    async findById(id: string): Promise<AutomaticCampaign | null> {
        const result = await this.prisma.automaticCampaign.findFirst({
            where: { id, deletedAt: null },
            include: {
                gifts: true,
                creatives: true,
                coupon: true,
                metaMessageTemplate: true,
                company: { select: { id: true, name: true } },
                _count: { select: { messages: true } }
            },
        });
        return result ? AutomaticCampaignMapper.toDomain(result) : null;
    }

    async update(id: string, data: Partial<AutomaticCampaign> & { gifts?: any; creatives?: any }): Promise<AutomaticCampaign> {
        const { gifts, creatives, ...updateData } = data;
        const result = await this.prisma.automaticCampaign.update({
            where: { id },
            data: {
                ...updateData as any,
                ...(gifts && {
                    gifts: {
                        deleteMany: {},
                        create: gifts.create
                    }
                }),
                ...(creatives && {
                    creatives: {
                        deleteMany: {},
                        ...(creatives.create && creatives.create.length > 0 && { create: creatives.create }),
                    }
                })
            },
            include: {
                gifts: true,
                creatives: true,
                coupon: true,
                company: { select: { id: true, name: true } },
                _count: { select: { messages: true } }
            },
        });
        return AutomaticCampaignMapper.toDomain(result);
    }

    async delete(id: string): Promise<void> {
        await this.softDelete(id);
    }

    async softDelete(id: string): Promise<AutomaticCampaign> {
        const result = await this.prisma.automaticCampaign.update({
            where: { id },
            data: { deletedAt: new Date(), active: false },
        });
        return AutomaticCampaignMapper.toDomain(result);
    }

    async restore(id: string): Promise<AutomaticCampaign> {
        const result = await this.prisma.automaticCampaign.update({
            where: { id },
            data: { deletedAt: null },
            include: {
                gifts: true,
                creatives: true,
                coupon: true,
                company: { select: { id: true, name: true } }
            },
        });
        return AutomaticCampaignMapper.toDomain(result);
    }

    async toggleActive(id: string, companyId: string): Promise<AutomaticCampaign> {
        const current = await this.prisma.automaticCampaign.findUnique({ where: { id } });
        if (!current) throw new Error('Not found');

        const result = await this.prisma.automaticCampaign.update({
            where: { id, companyId },
            data: { active: !current.active },
            include: {
                gifts: true,
                creatives: true,
                coupon: true,
                company: { select: { id: true, name: true } }
            },
        });
        return AutomaticCampaignMapper.toDomain(result);
    }

    async count(options?: any): Promise<number> {
        return this.prisma.automaticCampaign.count({ where: options });
    }

    async getCampaignMetrics(campaignId: string, range: ResolvedDateRange): Promise<any> {
        const { startDate, endDate, timeZone } = range;

        const campaignMetricAllTime = await this.prisma.campaignMetric.findFirst({
            where: {
                automaticCampaignId: campaignId,
            }
        });

        const costGroupRows = await this.prisma.$queryRaw<Omit<MessageCostGroupRow, 'campaignId'>[]>(
            Prisma.sql`
                SELECT
                    m."channel"::text AS channel,
                    t."category"::text AS category,
                    COUNT(*)::int AS count
                FROM "Message" m
                LEFT JOIN "meta_message_templates" t ON t.id = m."metaMessageTemplateId"
                WHERE m."automaticCampaignId" = ${campaignId}
                    AND m."status" = 'SENT'
                    AND m."createdAt" >= ${startDate}
                    AND m."createdAt" <= ${endDate}
                GROUP BY 1, 2
            `
        );
        const costGroups = costGroupRows.map((row) => ({
            channel: row.channel,
            category: row.category,
            count: Number(row.count),
        }));
        const totalCost = this.messageCost.totalCostBRL(costGroups);
        const messageTypeBreakdown = this.messageCost.buildBreakdown(costGroups);

        const messagesSentByDate = await this.prisma.$queryRaw<DailyMetrics[]>(
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
          messages AS (
            SELECT 
              DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
              COUNT(CASE WHEN m."status" = 'SENT' THEN 1 END)::int AS messages,
              COUNT(CASE WHEN m."status" = 'ERROR' THEN 1 END)::int AS errors
            FROM "Message" m
            WHERE m."automaticCampaignId" = ${campaignId}
              AND m."createdAt" >= (SELECT start_ts FROM bounds)
              AND m."createdAt" <= (SELECT end_ts FROM bounds)
            GROUP BY 1
          ),
          clicks AS (
            SELECT
              DATE(m."createdAt" AT TIME ZONE 'UTC' AT TIME ZONE (SELECT tz FROM bounds)) AS day,
              COUNT(DISTINCT mi."messageId")::int AS clicks
            FROM "Message" m
            INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
            WHERE m."automaticCampaignId" = ${campaignId}
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
              WHERE m."automaticCampaignId" = ${campaignId}
                AND m."createdAt" >= (SELECT start_ts FROM bounds)
                AND m."createdAt" <= (SELECT end_ts FROM bounds)
            ) attributed_orders
            GROUP BY 1
          )
          SELECT
            ds.day,
            COALESCE(m.messages, 0) AS messages,
            COALESCE(m.errors, 0) AS errors,
            COALESCE(c.clicks, 0) AS clicks,
            COALESCE(s.sales, 0) AS sales,
            COALESCE(s."salesAmount", 0) AS "salesAmount"
          FROM day_series ds
          LEFT JOIN messages m USING (day)
          LEFT JOIN clicks c USING (day)
          LEFT JOIN sales s USING (day)
          ORDER BY ds.day;
        `
        );

        const messagesSentByDateFormatted = messagesSentByDate.map(item => {
            const day = new Date(item.day)
                .toLocaleString('pt-BR', { day: '2-digit', month: 'short', timeZone: 'UTC' })
                .replace(' de ', ' ');

            return {
                day,
                messages: Number(item.messages),
                errors: Number(item.errors),
                clicks: Number(item.clicks),
                sales: Number(item.sales),
                salesAmount: Number(item.salesAmount),
            };
        });

        const periodTotals = messagesSentByDateFormatted.reduce(
            (acc, item) => ({
                messagesSent: acc.messagesSent + item.messages,
                messagesError: acc.messagesError + item.errors,
                interactions: acc.interactions + item.clicks,
                salesTotalQuantity: acc.salesTotalQuantity + item.sales,
                salesTotalAmount: acc.salesTotalAmount + item.salesAmount,
            }),
            {
                messagesSent: 0,
                messagesError: 0,
                interactions: 0,
                salesTotalQuantity: 0,
                salesTotalAmount: 0,
            },
        );
        const conversionRate = periodTotals.messagesSent > 0
            ? (periodTotals.salesTotalQuantity / periodTotals.messagesSent) * 100
            : 0;
        const campaignMetric = {
            ...(campaignMetricAllTime ?? {}),
            ...periodTotals,
            messagesDelivered: 0,
            conversionRate,
            totalCost,
            messageTypeBreakdown,
        };

        return {
            campaignMetric,
            campaignMetricAllTime,
            periodTotals: {
                ...periodTotals,
                conversionRate,
                totalCost,
                messageTypeBreakdown,
            },
            messagesSentByDate: messagesSentByDateFormatted,
        }
    }

    async getCampaignMessages(
        campaignId: string,
        filter: ResolvedCampaignMessagesFilter,
    ): Promise<{ data: any[]; meta: any }> {
        const { page, limit, orderBy, orderDirection, startDate, endDate, rfvClassification, status } = filter;
        const skip = (page - 1) * limit;

        const where: Prisma.MessageWhereInput = {
            automaticCampaignId: campaignId,
            createdAt: {
                gte: startDate,
                lte: endDate,
            },
            ...(rfvClassification && rfvClassification.length > 0
                ? { segmentation: { in: rfvClassification } }
                : {}),
            ...(status && status.length > 0 ? { status: { in: status } } : {}),
        };

        const [messages, total] = await Promise.all([
            this.prisma.message.findMany({
                select: {
                    customerId: true,
                    customerName: true,
                    phone: true,
                    segmentation: true,
                    messageText: true,
                    mediaUrl: true,
                    createdAt: true,
                    status: true,
                    scheduledDate: true,
                    customer: {
                        select: {
                            rfvClassification: true,
                        },
                    },
                    _count: {
                        select: {
                            messageInteractions: true,
                        },
                    },
                    MessageOrders: {
                        select: {
                            order: {
                                select: {
                                    id: true,
                                    displayId: true,
                                    status: true,
                                    total: true,
                                    orderType: true,
                                    salesChannel: true,
                                    createdAt: true,
                                },
                            },
                        },
                    },
                },
                where,
                orderBy: {
                    [orderBy]: orderDirection,
                },
                skip,
                take: limit,
            }),
            this.prisma.message.count({ where }),
        ]);

        const data = messages.map(({ customer, _count, MessageOrders, ...rest }) => ({
            ...rest,
            customerRfvClassification: customer?.rfvClassification ?? null,
            hasClick: (_count?.messageInteractions ?? 0) > 0,
            hasOrder: MessageOrders.length > 0,
            orders: MessageOrders.map((mo) => mo.order),
        }));

        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        };
    }
}
