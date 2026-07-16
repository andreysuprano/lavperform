import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { SALE_ATTRIBUTION_JOB_NAME } from '../listeners/order-created-attribution.listener';

interface SaleCampaignAttributionPayload {
  orderId: string;
  customerId: string;
  companyId: string;
}

@Processor(QUEUE_NAMES.SALE_CAMPAIGN_ATTRIBUTION)
export class SaleCampaignAttributionProcessor {
  private readonly logger = new Logger(SaleCampaignAttributionProcessor.name);

  constructor(private readonly prisma: PrismaService) {}

  @Process({ name: SALE_ATTRIBUTION_JOB_NAME, concurrency: 10 })
  async handleAttribution(job: Job<SaleCampaignAttributionPayload>) {
    const { orderId, customerId, companyId } = job.data;

    this.logger.log(`Processando atribuição de campanha para pedido ${orderId}`);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, createdAt: true, total: true },
    });

    if (!order) {
      this.logger.warn(`Pedido ${orderId} não encontrado, pulando atribuição`);
      return;
    }

    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { rfvClassification: true },
    });

    if (!customer?.rfvClassification) {
      this.logger.debug(
        `Cliente ${customerId} sem classificação RFV, pulando atribuição`,
      );
      return;
    }

    const conversionWindow =
      await this.prisma.campaignConversionWindow.findUnique({
        where: {
          companyId_rfvClassification: {
            companyId,
            rfvClassification: customer.rfvClassification,
          },
        },
      });

    if (!conversionWindow) {
      this.logger.debug(
        `Nenhuma janela de conversão configurada para empresa ${companyId} com RFV "${customer.rfvClassification}", pulando atribuição`,
      );
      return;
    }

    const windowStartMs =
      order.createdAt.getTime() -
      conversionWindow.thresholdDays * 24 * 60 * 60 * 1000;
    const windowStart = new Date(windowStartMs);

    const eligibleMessages = await this.prisma.message.findMany({
      where: {
        customerId,
        companyId,
        status: MessageStatus.SENT,
        createdAt: { gte: windowStart, lte: order.createdAt },
        OR: [
          { campaignId: { not: null } },
          { automaticCampaignId: { not: null } },
        ],
      },
      select: { id: true, campaignId: true, automaticCampaignId: true },
    });

    if (eligibleMessages.length === 0) {
      this.logger.debug(
        `Nenhuma mensagem de campanha encontrada na janela de conversão para pedido ${orderId}`,
      );
      return;
    }

    this.logger.log(
      `${eligibleMessages.length} mensagem(ns) elegível(is) encontrada(s) para pedido ${orderId}`,
    );

    for (const message of eligibleMessages) {
      await this.attributeOrderToMessage(message, order);
    }

    this.logger.log(
      `Atribuição de campanha concluída para pedido ${orderId}`,
    );
  }

  private async attributeOrderToMessage(
    message: { id: string; campaignId: string | null; automaticCampaignId: string | null },
    order: { id: string; total: unknown },
  ) {
    const existingMessageOrder = await this.prisma.messageOrder.findFirst({
      where: { messageId: message.id, orderId: order.id },
    });

    if (existingMessageOrder) {
      this.logger.debug(
        `MessageOrder já existe para mensagem ${message.id} e pedido ${order.id}, pulando`,
      );
      return;
    }

    await this.prisma.messageOrder.create({
      data: { messageId: message.id, orderId: order.id },
    });

    const metricWhere = message.campaignId
      ? { campaignId: message.campaignId }
      : { automaticCampaignId: message.automaticCampaignId! };

    const metric = await this.prisma.campaignMetric.findFirst({
      where: metricWhere,
      orderBy: { createdAt: 'desc' },
    });

    if (!metric) {
      this.logger.warn(
        `CampaignMetric não encontrada para campanha da mensagem ${message.id}`,
      );
      return;
    }

    const newSalesTotalQuantity = metric.salesTotalQuantity + 1;
    const newSalesTotalAmount =
      Number(metric.salesTotalAmount) + Number(order.total);
    const conversionRate =
      metric.messagesSent > 0
        ? (newSalesTotalQuantity / metric.messagesSent) * 100
        : 0;

    await this.prisma.campaignMetric.update({
      where: { id: metric.id },
      data: {
        salesTotalQuantity: newSalesTotalQuantity,
        salesTotalAmount: newSalesTotalAmount,
        conversionRate: Number(conversionRate.toFixed(2)),
      },
    });

    this.logger.log(
      `Métrica atualizada para campanha da mensagem ${message.id}: +1 venda, +${Number(order.total)} receita`,
    );
  }
}
