import { Injectable, Logger } from '@nestjs/common';
import { MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import {
  META_PAYMENT_ERROR_MESSAGE,
  findMetaPaymentError,
} from '../utils/meta-payment-error';
import type { ParsedMetaStatus } from '../utils/meta-status-webhook.util';
import { MetaPaymentIssueService } from './meta-payment-issue.service';

/**
 * Status assíncronos da Meta. O envio pode responder 200 e a recusa chegar
 * depois, no webhook. Entrega posterior à pendência fecha o aviso de pagamento.
 */
@Injectable()
export class MetaMessageStatusService {
  private readonly logger = new Logger(MetaMessageStatusService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentIssues: MetaPaymentIssueService,
  ) {}

  async handle(status: ParsedMetaStatus): Promise<void> {
    const integration = await this.prisma.metaIntegration.findFirst({
      where: { phoneNumberId: status.phoneNumberId },
      select: { companyId: true, metaPaymentIssueAt: true },
    });
    if (!integration) return;

    if (status.status === 'failed') {
      await this.handleFailed(integration.companyId, status);
      return;
    }
    if (status.status === 'sent') return;

    const message = await this.prisma.message.findFirst({
      where: {
        companyId: integration.companyId,
        externalProviderMessageId: status.metaMessageId,
      },
      select: { id: true, sentAt: true, createdAt: true },
    });
    if (!message || !integration.metaPaymentIssueAt) return;

    await this.paymentIssues.resolveIfDelivered(
      integration.companyId,
      message.sentAt ?? message.createdAt,
    );
  }

  private async handleFailed(
    companyId: string,
    status: ParsedMetaStatus,
  ): Promise<void> {
    const paymentError = findMetaPaymentError(status.errors);
    if (paymentError) {
      await this.paymentIssues.report(companyId, {
        code: paymentError.code,
        message: paymentError.message ?? paymentError.title ?? null,
      });
    }

    const message = await this.prisma.message.findFirst({
      where: { companyId, externalProviderMessageId: status.metaMessageId },
      select: {
        id: true,
        status: true,
        automaticCampaignId: true,
        campaignId: true,
      },
    });
    if (!message || message.status === MessageStatus.ERROR) return;

    const error = paymentError
      ? META_PAYMENT_ERROR_MESSAGE
      : describeErrors(status);
    const updated = await this.prisma.message.updateMany({
      where: { id: message.id, status: { not: MessageStatus.ERROR } },
      data: { status: MessageStatus.ERROR, error },
    });
    if (updated.count === 0) return;

    this.logger.warn(
      `Meta recusou a mensagem ${message.id} após o envio: ${error}`,
    );

    const where = message.automaticCampaignId
      ? { automaticCampaignId: message.automaticCampaignId }
      : message.campaignId
        ? { campaignId: message.campaignId }
        : null;
    if (!where) return;

    await this.prisma.campaignMetric.updateMany({
      where,
      data: {
        messagesError: { increment: 1 },
        ...(message.status === MessageStatus.SENT
          ? { messagesSent: { decrement: 1 } }
          : {}),
      },
    });
  }
}

function describeErrors(status: ParsedMetaStatus): string {
  const text = status.errors
    .map((error) => {
      const base = error.message || error.title || 'Erro da Meta';
      return `${error.details ? `${base} (${error.details})` : base} (código Meta: ${error.code})`;
    })
    .join('; ');
  return text || 'A Meta não entregou a mensagem';
}
