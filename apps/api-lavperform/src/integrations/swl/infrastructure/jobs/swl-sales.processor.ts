import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import {
  SwlSalesService,
  SwlSyncMode,
} from '../../application/swl-sales.service';
import { SwlPermanentHttpError } from '../../api/swl-http.error';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface SwlSalesJobData {
  companyId: string;
  mode: SwlSyncMode;
  startDate?: string;
  endDate?: string;
}

function isPermanent(error: unknown): boolean {
  return (
    error instanceof SwlPermanentHttpError ||
    (typeof error === 'object' &&
      error !== null &&
      (error as { name?: string }).name === 'SwlPermanentHttpError')
  );
}

@Processor(QUEUE_NAMES.SWL_SALES_IMPORT)
export class SwlSalesProcessor {
  private readonly logger = new Logger(SwlSalesProcessor.name);

  constructor(
    private readonly swlSalesService: SwlSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.SWL_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<SwlSalesJobData>) {
    const { companyId, mode, startDate, endDate } = job.data;
    const range = startDate || endDate ? { startDate, endDate } : undefined;

    try {
      await this.swlSalesService.syncCompany(companyId, mode, range);
    } catch (error) {
      this.logger.error(
        `Erro ao sincronizar vendas SWL da empresa ${companyId}:`,
        error instanceof Error ? error.message : error,
      );

      const permanent = isPermanent(error);
      if (permanent) {
        await job.discard();
      }
      if (permanent || isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'swl',
          companyId,
          kind: mode === 'historical' ? 'backfill90' : 'catchup',
          jobId: job.opts?.jobId != null ? String(job.opts.jobId) : undefined,
          attempts: job.attemptsMade + 1,
          failedAt: new Date(),
          error,
        });
      }
      if (permanent) {
        return;
      }
      throw error;
    }
  }
}
