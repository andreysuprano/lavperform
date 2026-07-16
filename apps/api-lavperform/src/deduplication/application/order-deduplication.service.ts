import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export interface DuplicateOrderGroup {
  companyId: string;
  customerId: string;
  displayId: number;
  integratorOrderId: number | null;
  orderIds: string[];
  count: number;
}

export interface OrderDeduplicationPreview {
  companyId: string;
  customerId: string;
  customerName: string | null;
  duplicateGroups: number;
  ordersToDelete: number;
  ordersToKeep: number;
  groups: DuplicateOrderGroup[];
}

export interface DeleteOrderGroupResult {
  deletedCount: number;
  keptOrderId: string;
}

@Injectable()
export class OrderDeduplicationService {
  private readonly logger = new Logger(OrderDeduplicationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async validateCustomer(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true, name: true, companyId: true },
    });

    if (!customer) {
      throw new NotFoundException(
        `Cliente ${customerId} não encontrado na empresa ${companyId}`,
      );
    }

    return customer;
  }

  async findDuplicateOrderGroups(
    companyId: string,
    customerId: string,
  ): Promise<DuplicateOrderGroup[]> {
    const rows = await this.prisma.$queryRaw<
      Array<{
        companyId: string;
        customerId: string;
        displayId: number;
        integratorOrderId: number | null;
        count: bigint;
        orderIds: string[];
      }>
    >`
      SELECT
        "companyId",
        "customerId",
        "displayId",
        "integratorOrderId",
        COUNT(*)::bigint AS count,
        ARRAY_AGG(id ORDER BY "createdAt", id) AS "orderIds"
      FROM "Order"
      WHERE "companyId" = ${companyId}
        AND "customerId" = ${customerId}
      GROUP BY "companyId", "customerId", "displayId", "integratorOrderId"
      HAVING COUNT(*) > 1
      ORDER BY count DESC, "displayId", "integratorOrderId"
    `;

    return rows.map((row) => ({
      companyId: row.companyId,
      customerId: row.customerId,
      displayId: row.displayId,
      integratorOrderId: row.integratorOrderId,
      orderIds: row.orderIds,
      count: Number(row.count),
    }));
  }

  async preview(
    companyId: string,
    customerId: string,
  ): Promise<OrderDeduplicationPreview> {
    const customer = await this.validateCustomer(companyId, customerId);
    const groups = await this.findDuplicateOrderGroups(companyId, customerId);

    const ordersToDelete = groups.reduce(
      (sum, group) => sum + group.count - 1,
      0,
    );

    return {
      companyId,
      customerId,
      customerName: customer.name,
      duplicateGroups: groups.length,
      ordersToDelete,
      ordersToKeep: groups.length,
      groups,
    };
  }

  async deleteOrderGroup(
    keepOrderId: string,
    orderIdsToDelete: string[],
  ): Promise<DeleteOrderGroupResult> {
    if (orderIdsToDelete.length === 0) {
      return { deletedCount: 0, keptOrderId: keepOrderId };
    }

    let deletedCount = 0;

    for (const orderId of orderIdsToDelete) {
      try {
        await this.prisma.order.delete({ where: { id: orderId } });
        deletedCount += 1;
        this.logger.log(`Pedido duplicado ${orderId} removido (mantido ${keepOrderId})`);
      } catch (error) {
        this.logger.error(
          `Erro ao excluir pedido duplicado ${orderId}: ${
            error instanceof Error ? error.message : error
          }`,
        );
      }
    }

    return { deletedCount, keptOrderId: keepOrderId };
  }

  async adjustCampaignMetricsAfterOrderDeletion(
    orderIdsToDelete: string[],
  ): Promise<void> {
    if (orderIdsToDelete.length === 0) {
      return;
    }

    const messageOrders = await this.prisma.messageOrder.findMany({
      where: { orderId: { in: orderIdsToDelete } },
      select: {
        id: true,
        orderId: true,
        order: { select: { total: true } },
        message: {
          select: {
            campaignId: true,
            automaticCampaignId: true,
          },
        },
      },
    });

    if (messageOrders.length === 0) {
      return;
    }

    const adjustments = new Map<
      string,
      { quantity: number; amount: Prisma.Decimal }
    >();

    for (const messageOrder of messageOrders) {
      const campaignKey = messageOrder.message.automaticCampaignId
        ? `auto:${messageOrder.message.automaticCampaignId}`
        : messageOrder.message.campaignId
          ? `manual:${messageOrder.message.campaignId}`
          : null;

      if (!campaignKey) {
        continue;
      }

      const current = adjustments.get(campaignKey) ?? {
        quantity: 0,
        amount: new Prisma.Decimal(0),
      };

      current.quantity += 1;
      current.amount = current.amount.plus(
        new Prisma.Decimal(messageOrder.order.total as unknown as string),
      );
      adjustments.set(campaignKey, current);
    }

    for (const [campaignKey, adjustment] of adjustments) {
      const isAutomatic = campaignKey.startsWith('auto:');
      const campaignId = campaignKey.split(':')[1];

      const metric = await this.prisma.campaignMetric.findFirst({
        where: isAutomatic
          ? { automaticCampaignId: campaignId }
          : { campaignId },
        orderBy: { createdAt: 'desc' },
      });

      if (!metric) {
        continue;
      }

      const projectedSalesQuantity = Math.max(
        metric.salesTotalQuantity - adjustment.quantity,
        0,
      );
      const projectedSalesAmount = Prisma.Decimal.max(
        new Prisma.Decimal(metric.salesTotalAmount).minus(adjustment.amount),
        new Prisma.Decimal(0),
      );
      const projectedConversionRate =
        metric.messagesSent > 0
          ? new Prisma.Decimal(projectedSalesQuantity)
              .div(metric.messagesSent)
              .times(100)
              .toDecimalPlaces(2)
          : new Prisma.Decimal(0);

      await this.prisma.campaignMetric.update({
        where: { id: metric.id },
        data: {
          salesTotalQuantity: projectedSalesQuantity,
          salesTotalAmount: projectedSalesAmount,
          conversionRate: projectedConversionRate,
        },
      });
    }
  }
}
