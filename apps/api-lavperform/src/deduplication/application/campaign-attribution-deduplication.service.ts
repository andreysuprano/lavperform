import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DuplicateAttributionGroup {
  orderId: string;
  messageOrderIds: string[];
  count: number;
  totalAmount: Prisma.Decimal;
}

export interface CampaignAttributionDeduplicationPreview {
  automaticCampaignId: string;
  campaignName: string;
  companyId: string;
  customerId: string | null;
  duplicateGroups: number;
  attributionsToDelete: number;
  attributionsToKeep: number;
  amountToSubtract: string;
  groups: DuplicateAttributionGroup[];
}

export interface RemoveDuplicateAttributionsResult {
  deletedCount: number;
  updatedMetricId: string | null;
}

@Injectable()
export class CampaignAttributionDeduplicationService {
  private readonly logger = new Logger(CampaignAttributionDeduplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateCampaign(automaticCampaignId: string) {
    const campaign = await this.prisma.automaticCampaign.findUnique({
      where: { id: automaticCampaignId },
      select: { id: true, name: true, companyId: true, deletedAt: true },
    });

    if (!campaign) {
      throw new NotFoundException(
        `Campanha automática ${automaticCampaignId} não encontrada`,
      );
    }

    return campaign;
  }

  async findDuplicateAttributionGroups(
    automaticCampaignId: string,
    customerId?: string,
  ): Promise<DuplicateAttributionGroup[]> {
    const customerFilter = customerId
      ? Prisma.sql`AND m."customerId" = ${customerId}`
      : Prisma.empty;

    const rows = await this.prisma.$queryRaw<
      Array<{
        orderId: string;
        count: bigint;
        messageOrderIds: string[];
        totalAmount: string;
      }>
    >`
      SELECT
        mo."orderId",
        COUNT(*)::bigint AS count,
        ARRAY_AGG(mo.id ORDER BY mo."createdAt", mo.id) AS "messageOrderIds",
        SUM(o.total)::text AS "totalAmount"
      FROM "MessageOrder" mo
      INNER JOIN "Message" m ON m.id = mo."messageId"
      INNER JOIN "Order" o ON o.id = mo."orderId"
      WHERE m."automaticCampaignId" = ${automaticCampaignId}
        ${customerFilter}
      GROUP BY mo."orderId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC, mo."orderId"
    `;

    return rows.map((row) => ({
      orderId: row.orderId,
      messageOrderIds: row.messageOrderIds,
      count: Number(row.count),
      totalAmount: new Prisma.Decimal(row.totalAmount),
    }));
  }

  async preview(
    automaticCampaignId: string,
    customerId?: string,
  ): Promise<CampaignAttributionDeduplicationPreview> {
    const campaign = await this.validateCampaign(automaticCampaignId);
    const groups = await this.findDuplicateAttributionGroups(
      automaticCampaignId,
      customerId,
    );

    const attributionsToDelete = groups.reduce(
      (sum, group) => sum + group.count - 1,
      0,
    );

    const amountToSubtract = groups.reduce(
      (sum, group) => {
        const perAttribution = group.totalAmount.div(group.count);
        return sum.plus(perAttribution.times(group.count - 1));
      },
      new Prisma.Decimal(0),
    );

    return {
      automaticCampaignId,
      campaignName: campaign.name,
      companyId: campaign.companyId,
      customerId: customerId ?? null,
      duplicateGroups: groups.length,
      attributionsToDelete,
      attributionsToKeep: groups.length,
      amountToSubtract: amountToSubtract.toString(),
      groups,
    };
  }

  async removeDuplicateAttributions(
    automaticCampaignId: string,
    orderId: string,
    keepMessageOrderId: string,
    messageOrderIdsToDelete: string[],
  ): Promise<RemoveDuplicateAttributionsResult> {
    if (messageOrderIdsToDelete.length === 0) {
      return { deletedCount: 0, updatedMetricId: null };
    }

    const messageOrders = await this.prisma.messageOrder.findMany({
      where: { id: { in: messageOrderIdsToDelete } },
      select: {
        id: true,
        order: { select: { total: true } },
      },
    });

    const totalAmount = messageOrders.reduce(
      (acc, mo) =>
        acc.plus(new Prisma.Decimal(mo.order.total as unknown as string)),
      new Prisma.Decimal(0),
    );
    const totalQuantity = messageOrders.length;

    const metrics = await this.prisma.campaignMetric.findMany({
      where: { automaticCampaignId },
      orderBy: { createdAt: 'desc' },
    });

    const targetMetric = metrics[0];
    let updatedMetricId: string | null = null;

    const result = await this.prisma.$transaction(async (tx) => {
      const deleted = await tx.messageOrder.deleteMany({
        where: { id: { in: messageOrderIdsToDelete } },
      });

      if (targetMetric) {
        const projectedSalesQuantity = Math.max(
          targetMetric.salesTotalQuantity - totalQuantity,
          0,
        );
        const projectedSalesAmount = Prisma.Decimal.max(
          new Prisma.Decimal(targetMetric.salesTotalAmount).minus(totalAmount),
          new Prisma.Decimal(0),
        );
        const projectedConversionRate =
          targetMetric.messagesSent > 0
            ? new Prisma.Decimal(projectedSalesQuantity)
                .div(targetMetric.messagesSent)
                .times(100)
                .toDecimalPlaces(2)
            : new Prisma.Decimal(0);

        const updated = await tx.campaignMetric.update({
          where: { id: targetMetric.id },
          data: {
            salesTotalQuantity: projectedSalesQuantity,
            salesTotalAmount: projectedSalesAmount,
            conversionRate: projectedConversionRate,
          },
        });
        updatedMetricId = updated.id;
      }

      return deleted.count;
    });

    this.logger.log(
      `Atribuições duplicadas removidas para pedido ${orderId} na campanha ${automaticCampaignId}: ${result} (mantida ${keepMessageOrderId})`,
    );

    return { deletedCount: result, updatedMetricId };
  }
}
