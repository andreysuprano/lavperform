import { Injectable, Logger, Optional } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/redis/redis.service';
import {
  salesBackfill90JobId,
  salesImportSlot,
} from '../../sales-import/sales-import-schedule';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from '../../sales-import/sales-import-queue';
import { isSwlAuthBlocked, swlAuthBlockKey } from '../swl-auth-block';

@Injectable()
export class SwlSalesTasks {
  private readonly logger = new Logger(SwlSalesTasks.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(QUEUE_NAMES.SWL_SALES_IMPORT)
    private readonly swlSalesQueue: Queue,
    @Optional() private readonly redis?: RedisService,
  ) {}

  @Cron('*/30 * * * *')
  async handleSalesSync() {
    try {
      const now = new Date();
      const companies = await this.findActiveCompanies();

      for (const company of companies) {
        try {
          await this.enqueueCompany(company, now);
        } catch (error) {
          this.logger.error(
            `Erro ao enfileirar sincronização SWL da empresa ${company.id}:`,
            error instanceof Error ? error.message : error,
          );
        }
      }
    } catch (error) {
      this.logger.error(
        'Erro ao processar sincronização de vendas SWL:',
        error instanceof Error ? error.message : error,
      );
    }
  }

  private async enqueueCompany(
    company: {
      id: string;
      name?: string;
      digitalMenuIntegration?: Array<{ apiKey?: string | null }>;
    },
    now: Date,
  ): Promise<void> {
    const token = company.digitalMenuIntegration?.find((integration) =>
      integration.apiKey?.trim(),
    )?.apiKey;
    if (!token) {
      return;
    }

    const storedHash = await this.redis?.getJson<string>(
      swlAuthBlockKey(company.id),
    );
    if (isSwlAuthBlocked(storedHash ?? null, token)) {
      this.logger.warn(
        `Token SWL bloqueado para ${company.name} (${company.id})`,
      );
      return;
    }

    const state = await (this.prisma as any).swlSyncState.findUnique({
      where: { companyId: company.id },
    });

    if (!state?.attendancesWatermark) {
      await enqueueSalesImportJob(
        this.swlSalesQueue,
        QUEUE_NAMES.SWL_SALES_IMPORT,
        { companyId: company.id, mode: 'historical' },
        buildSalesImportJobOptions(salesBackfill90JobId('swl', company.id)),
      );
      return;
    }

    await enqueueSalesImportJob(
      this.swlSalesQueue,
      QUEUE_NAMES.SWL_SALES_IMPORT,
      { companyId: company.id, mode: 'incremental' },
      buildSalesImportJobOptions(
        `swl-sync:${company.id}:${salesImportSlot(now)}`,
      ),
    );
  }

  private findActiveCompanies() {
    return this.prisma.company.findMany({
      where: {
        state: 'ACTIVE',
        digitalMenuIntegration: {
          some: {
            active: true,
            apiKey: { not: null },
            partner: { partnerSlug: 'SWL' },
          },
        },
      },
      include: {
        digitalMenuIntegration: {
          where: {
            active: true,
            apiKey: { not: null },
            partner: { partnerSlug: 'SWL' },
          },
          select: { apiKey: true },
        },
      },
    });
  }
}
