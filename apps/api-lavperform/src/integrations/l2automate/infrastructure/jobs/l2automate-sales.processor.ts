import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { L2AutomateSalesService } from '../../application/l2automate-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';
import { weeklyReplayRange } from '../../../sales-import/sales-import-schedule';

interface L2AutomateSalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT)
export class L2AutomateSalesProcessor {
  private readonly logger = new Logger(L2AutomateSalesProcessor.name);

  constructor(
    private readonly l2AutomateSalesService: L2AutomateSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<L2AutomateSalesJobData>) {
    const { companyId, date, backfill90 } = job.data;

    try {
      if (backfill90) {
        this.logger.log(
          `Processando reexecução de 7 dias L2 Automate para empresa ${companyId}`,
        );

        const result =
          await this.l2AutomateSalesService.importHistoricalSales(
            companyId,
            weeklyReplayRange(),
          );

        this.logger.log(
          `Reexecução de 7 dias concluída para empresa ${companyId}: ${result.jobsCreated} jobs`,
        );

        return result;
      }

      if (!date) {
        throw new Error(
          `Job de importação L2 Automate sem data para empresa ${companyId}`,
        );
      }

      this.logger.log(
        `Processando importação L2 Automate para empresa ${companyId} - data: ${date}`,
      );

      await this.l2AutomateSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação L2 Automate concluída para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas L2 Automate para empresa ${companyId}:`,
        error.message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'l2automate',
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
