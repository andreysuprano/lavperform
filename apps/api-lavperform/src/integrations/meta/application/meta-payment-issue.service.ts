import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

export interface MetaPaymentIssue {
  detectedAt: Date;
  code: number;
  message: string | null;
}

/**
 * Indica se a Meta está recusando os envios da empresa por pendência de
 * pagamento na WABA. A pendência abre com um erro de pagamento e só fecha
 * quando uma mensagem enviada depois dela é entregue.
 */
@Injectable()
export class MetaPaymentIssueService {
  private readonly logger = new Logger(MetaPaymentIssueService.name);

  constructor(private readonly prisma: PrismaService) {}

  async report(
    companyId: string,
    error: { code: number; message?: string | null },
  ): Promise<void> {
    try {
      const opened = await this.prisma.metaIntegration.updateMany({
        where: { companyId, metaPaymentIssueAt: null },
        data: {
          metaPaymentIssueAt: new Date(),
          metaPaymentIssueCode: error.code,
          metaPaymentIssueMessage: error.message ?? null,
        },
      });
      if (opened.count > 0) {
        this.logger.warn(
          `Pendência de pagamento na Meta detectada para a empresa ${companyId} (code ${error.code}): ${error.message ?? ''}`,
        );
        return;
      }
      await this.prisma.metaIntegration.updateMany({
        where: { companyId },
        data: {
          metaPaymentIssueCode: error.code,
          metaPaymentIssueMessage: error.message ?? null,
        },
      });
    } catch (err) {
      this.logger.error(
        `Falha ao registrar pendência de pagamento da Meta para a empresa ${companyId}: ${(err as Error).message}`,
      );
    }
  }

  async resolveIfDelivered(
    companyId: string,
    deliveredMessageSentAt: Date,
  ): Promise<void> {
    try {
      const resolved = await this.prisma.metaIntegration.updateMany({
        where: {
          companyId,
          metaPaymentIssueAt: { lt: deliveredMessageSentAt },
        },
        data: {
          metaPaymentIssueAt: null,
          metaPaymentIssueCode: null,
          metaPaymentIssueMessage: null,
        },
      });
      if (resolved.count > 0) {
        this.logger.log(
          `Pendência de pagamento na Meta resolvida para a empresa ${companyId}`,
        );
      }
    } catch (err) {
      this.logger.error(
        `Falha ao limpar pendência de pagamento da Meta para a empresa ${companyId}: ${(err as Error).message}`,
      );
    }
  }

  static toIssue(integration: {
    metaPaymentIssueAt: Date | null;
    metaPaymentIssueCode: number | null;
    metaPaymentIssueMessage: string | null;
  }): MetaPaymentIssue | null {
    if (
      !integration.metaPaymentIssueAt ||
      integration.metaPaymentIssueCode == null
    ) {
      return null;
    }
    return {
      detectedAt: integration.metaPaymentIssueAt,
      code: integration.metaPaymentIssueCode,
      message: integration.metaPaymentIssueMessage,
    };
  }
}
