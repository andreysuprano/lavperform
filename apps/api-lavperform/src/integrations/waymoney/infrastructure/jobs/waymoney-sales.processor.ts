import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { WaymoneySalesService } from '../../application/waymoney-sales.service';
import { WaymoneyLoginRejectedError } from '../../api/waymoney.service';
import { weeklyReplayRange } from '../../../sales-import/sales-import-schedule';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface WaymoneySalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
}

function isLoginRejected(error: unknown): boolean {
  return (
    error instanceof WaymoneyLoginRejectedError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'WaymoneyLoginRejectedError')
  );
}

@Processor(QUEUE_NAMES.WAYMONEY_SALES_IMPORT)
export class WaymoneySalesProcessor {
  private readonly logger = new Logger(WaymoneySalesProcessor.name);

  constructor(
    private readonly waymoneySalesService: WaymoneySalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.WAYMONEY_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<WaymoneySalesJobData>) {
    const { companyId, date, backfill90 } = job.data;

    try {
      if (backfill90) {
        await this.waymoneySalesService.importHistoricalSales(
          companyId,
          weeklyReplayRange(),
        );
        return;
      }

      if (!date) {
        throw new Error(
          `Job de importação WayMoney sem data para empresa ${companyId}`,
        );
      }

      await this.waymoneySalesService.processDailySales(companyId, date);
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas WayMoney para empresa ${companyId}:`,
        error instanceof Error ? error.message : error,
      );

      if (isLoginRejected(error)) {
        await this.waymoneySalesService.blockAuth(
          companyId,
          error instanceof Error ? error.name : 'WaymoneyLoginRejectedError',
        );
        await job.discard();
        await this.alert.notify({
          partner: 'waymoney',
          companyId,
          kind: backfill90 ? 'backfill90' : 'catchup',
          date,
          jobId: job.opts?.jobId != null ? String(job.opts.jobId) : undefined,
          attempts: job.attemptsMade + 1,
          failedAt: new Date(),
          error,
        });
        throw error;
      }

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'waymoney',
          companyId,
          kind: backfill90 ? 'backfill90' : 'catchup',
          date,
          jobId: job.opts?.jobId != null ? String(job.opts.jobId) : undefined,
          attempts: job.attemptsMade + 1,
          failedAt: new Date(),
          error,
        });
      }

      throw error;
    }
  }
}
