import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { WindelSalesService } from '../../application/windel-sales.service';
import { WindelLoginRejectedError, WindelMfaRequiredError } from '../../api/windel.service';
import { windelReplayRange } from '../../windel-lookback';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface WindelSalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
  syncCustomers?: boolean;
}

function isWindelAuthStop(error: unknown): boolean {
  const name =
    typeof error === 'object' && error !== null
      ? (error as { name?: string }).name
      : undefined;
  return (
    error instanceof WindelMfaRequiredError ||
    error instanceof WindelLoginRejectedError ||
    name === 'WindelMfaRequiredError' ||
    name === 'WindelLoginRejectedError'
  );
}

@Processor(QUEUE_NAMES.WINDEL_SALES_IMPORT)
export class WindelSalesProcessor {
  private readonly logger = new Logger(WindelSalesProcessor.name);

  constructor(
    private readonly windelSalesService: WindelSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.WINDEL_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<WindelSalesJobData>) {
    const { companyId, date, backfill90, syncCustomers } = job.data;

    try {
      if (syncCustomers) {
        this.logger.log(
          `Sincronizando clientes Windel da empresa ${companyId}`,
        );
        await this.windelSalesService.syncCustomers(companyId);
        return;
      }

      if (backfill90) {
        this.logger.log(
          `Processando reexecução de 30 dias Windel para empresa ${companyId}`,
        );

        const result = await this.windelSalesService.importHistoricalSales(
          companyId,
          windelReplayRange(),
        );

        this.logger.log(
          `Reexecução de 30 dias concluída para empresa ${companyId}: ${result.jobsCreated} jobs`,
        );

        return result;
      }

      if (!date) {
        throw new Error(
          `Job de importação Windel sem data para empresa ${companyId}`,
        );
      }

      this.logger.log(
        `Processando importação Windel para empresa ${companyId} - data: ${date}`,
      );

      await this.windelSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação Windel concluída para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas Windel para empresa ${companyId}:`,
        error.message,
      );

      if (isWindelAuthStop(error)) {
        await this.windelSalesService.blockAuth(
          companyId,
          error instanceof Error ? error.name : 'WindelAuthStop',
        );
        await job.discard();
        await this.alert.notify({
          partner: 'windel',
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
          partner: 'windel',
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
