import { Injectable } from '@nestjs/common';
import {
  CampaignStatus,
  CompanyStatus,
  CreditTopupStatus,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { reaisToCents } from './admin-overview.utils';

export type AdminOverviewMetrics = {
  companiesCount: number;
  activeCampaignsCount: number;
  customersCount: number;
  mrrCents: number;
  topupsPaidCents: number;
  incentivizedRevenue: number;
  incentivizedOrdersCount: number;
};

type MrrRow = { mrrReais: number };
type IncentivizedRow = { totalValue: number; totalCount: number };

@Injectable()
export class AdminOverviewRepository {
  constructor(private readonly prisma: PrismaService) {}

  async fetchMetrics(): Promise<AdminOverviewMetrics> {
    const [
      companiesCount,
      automaticActiveCount,
      scheduledActiveCount,
      customersCount,
      topupsAggregate,
      mrrRows,
      incentivizedRows,
    ] = await Promise.all([
      this.prisma.company.count({ where: { deletedAt: null } }),
      this.prisma.automaticCampaign.count({
        where: {
          active: true,
          deletedAt: null,
        },
      }),
      this.prisma.campaign.count({
        where: {
          status: { in: [CampaignStatus.WAITING, CampaignStatus.PROCESSING] },
        },
      }),
      this.prisma.customer.count(),
      this.prisma.creditTopup.aggregate({
        _sum: { amountCents: true },
        where: { status: CreditTopupStatus.PAID },
      }),
      this.prisma.$queryRaw<MrrRow[]>(Prisma.sql`
        SELECT COALESCE(SUM(
          CASE p.cycle
            WHEN 'MONTHLY' THEN p.price
            WHEN 'YEARLY' THEN p.price / 12
            WHEN 'QUARTERLY' THEN p.price / 3
            WHEN 'SEMIANNUALLY' THEN p.price / 6
            ELSE p.price
          END
        ), 0)::float AS "mrrReais"
        FROM "CompanySubscription" cs
        INNER JOIN "Company" c ON c.id = cs."companyId"
        INNER JOIN "Plan" p ON p.id = cs."planId"
        WHERE c.state = ${CompanyStatus.ACTIVE}::"CompanyStatus"
          AND c."deletedAt" IS NULL
          AND p.price > 0
      `),
      this.prisma.$queryRaw<IncentivizedRow[]>(Prisma.sql`
        WITH attributed_orders_by_campaign AS (
          SELECT DISTINCT
            COALESCE(m."campaignId", m."automaticCampaignId") AS "campaignId",
            mo."orderId",
            o.total
          FROM "MessageOrder" mo
          INNER JOIN "Message" m ON m.id = mo."messageId"
          INNER JOIN "Order" o ON o.id = mo."orderId"
          WHERE m."campaignId" IS NOT NULL OR m."automaticCampaignId" IS NOT NULL
        )
        SELECT
          COALESCE(SUM(total), 0)::float AS "totalValue",
          COUNT(*)::int AS "totalCount"
        FROM attributed_orders_by_campaign
      `),
    ]);

    const mrrReais = Number(mrrRows[0]?.mrrReais ?? 0);
    const incentivized = incentivizedRows[0] ?? {
      totalValue: 0,
      totalCount: 0,
    };

    return {
      companiesCount,
      activeCampaignsCount: automaticActiveCount + scheduledActiveCount,
      customersCount,
      mrrCents: reaisToCents(mrrReais),
      topupsPaidCents: topupsAggregate._sum.amountCents ?? 0,
      incentivizedRevenue: Number(incentivized.totalValue),
      incentivizedOrdersCount: Number(incentivized.totalCount),
    };
  }
}
