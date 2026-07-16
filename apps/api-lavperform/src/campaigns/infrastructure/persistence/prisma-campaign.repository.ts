import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { ICampaignRepository } from '../../domain/campaign.repository.interface';
import { Campaign } from '../../domain/campaign.entity';
import { CampaignMapper } from './mappers/campaign.mapper';
import { CampaignFilterDto } from '../../application/dto/campaign-filter.dto';
import { CampaignStatus, Prisma } from '@prisma/client';

type CampaignMetricFromMessages = {
    campaignId: string;
    messagesSent: number;
    messagesError: number;
    interactions: number;
    salesTotalQuantity: number;
    salesTotalAmount: number;
};

@Injectable()
export class CampaignPrismaRepository implements ICampaignRepository {
    constructor(private readonly prisma: PrismaService) { }

    private buildMetricFromMessages(
        metric: CampaignMetricFromMessages,
        originalMetric?: any,
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
        };
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
                        m."campaignId",
                        COUNT(CASE WHEN m."status" = 'SENT' THEN 1 END)::int AS "messagesSent",
                        COUNT(CASE WHEN m."status" = 'ERROR' THEN 1 END)::int AS "messagesError"
                    FROM "Message" m
                    WHERE m."campaignId" IN (SELECT id FROM selected_campaigns)
                    GROUP BY 1
                ),
                click_counts AS (
                    SELECT
                        m."campaignId",
                        COUNT(DISTINCT mi."messageId")::int AS interactions
                    FROM "Message" m
                    INNER JOIN "MessageInteraction" mi ON mi."messageId" = m.id
                    WHERE m."campaignId" IN (SELECT id FROM selected_campaigns)
                    GROUP BY 1
                ),
                attributed_orders AS (
                    SELECT DISTINCT
                        m."campaignId",
                        mo."orderId",
                        o.total
                    FROM "Message" m
                    INNER JOIN "MessageOrder" mo ON mo."messageId" = m.id
                    INNER JOIN "Order" o ON o.id = mo."orderId"
                    WHERE m."campaignId" IN (SELECT id FROM selected_campaigns)
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

    async create(data: Partial<Campaign>): Promise<Campaign> {
        const created = await this.prisma.campaign.create({ data: data as any });
        return CampaignMapper.toDomain(created);
    }

    async createWithMetric(data: Partial<Campaign>): Promise<Campaign> {
        const created = await this.prisma.$transaction(async (prisma) => {
            const createdCampaign = await prisma.campaign.create({
                data: data as any,
                include: { campaignMetric: true }
            });

            await prisma.campaignMetric.create({
                data: { campaignId: createdCampaign.id }
            });

            return createdCampaign;
        });

        return CampaignMapper.toDomain(created);
    }

    async findAll(options?: any): Promise<Campaign[]> {
        const result = await this.prisma.campaign.findMany({ where: options });
        return result.map(CampaignMapper.toDomain);
    }

    async findAllWithFilters(companyId: string, pagination: any, filter: CampaignFilterDto): Promise<{ items: Campaign[]; total: number }> {
        const { page = 1, limit = 10, name } = pagination;
        const { startDate, endDate } = filter;
        const skip = (page - 1) * limit;

        const where: any = {
            companyId,
            scheduledDate: {
                ...(startDate && { gte: startDate }),
                ...(endDate && { lte: endDate }),
            },
        };
        if (name) {
            where.name = {
                contains: name,
                mode: 'insensitive',
            };
        }

        const [campaigns, total] = await Promise.all([
            this.prisma.campaign.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    campaignMetric: true,
                },
            }),
            this.prisma.campaign.count({ where }),
        ]);

        const metricsByCampaignId = await this.getMetricsFromMessages(
            campaigns.map((campaign) => campaign.id),
        );
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
                ),
            ],
        }));

        return {
            items: campaignsWithMessageMetrics.map(CampaignMapper.toDomain),
            total
        };
    }

    async findById(id: string): Promise<Campaign | null> {
        const result = await this.prisma.campaign.findUnique({ where: { id } });
        return result ? CampaignMapper.toDomain(result) : null;
    }

    async update(id: string, data: Partial<Campaign>): Promise<Campaign> {
        const updated = await this.prisma.campaign.update({
            where: { id },
            data: data as any
        });
        return CampaignMapper.toDomain(updated);
    }

    async updateStatus(id: string, status: string): Promise<Campaign> {
        const updated = await this.prisma.campaign.update({
            where: { id },
            data: { status: status as CampaignStatus }
        });
        return CampaignMapper.toDomain(updated);
    }

    async delete(id: string): Promise<void> {
        await this.prisma.campaign.delete({ where: { id } });
    }

    async count(options?: any): Promise<number> {
        return this.prisma.campaign.count({ where: options });
    }
}
