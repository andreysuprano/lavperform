import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { HybexEssenceSalesService } from '../../application/essence-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';
import { weeklyReplayRange } from '../../../sales-import/sales-import-schedule';

interface EssenceSalesJobData {
  companyId: string;
  date?: string;
  syncCustomers?: boolean;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT)
export class HybexEssenceSalesProcessor {
  private readonly logger = new Logger(HybexEssenceSalesProcessor.name);

  constructor(
    private readonly essenceSalesService: HybexEssenceSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT, concurrency: 1 })
  async processImport(job: Job<EssenceSalesJobData>) {
    const { companyId, date, syncCustomers, backfill90 } = job.data;

    try {
      if (syncCustomers) {
        this.logger.log(
          `Sincronizando clientes Hybex Essence da empresa ${companyId}`,
        );
        await this.essenceSalesService.syncCustomers(companyId);
      }

      if (backfill90) {
        this.logger.log(
          `Processando reexecução de 7 dias Hybex Essence para empresa ${companyId}`,
        );

        const result = await this.essenceSalesService.importHistoricalSales(
          companyId,
          weeklyReplayRange(),
        );

        this.logger.log(
          `Reexecução de 7 dias concluída para empresa ${companyId}: ${result.jobsCreated} jobs`,
        );

        return result;
      }

      if (syncCustomers && !date) {
        return;
      }

      if (!date) {
        throw new Error(
          'Job Hybex Essence sem data e sem sync de clientes',
        );
      }

      this.logger.log(
        `Processando importação Hybex Essence para empresa ${companyId} - data: ${date}`,
      );
      await this.essenceSalesService.processDailySales(companyId, date);
    } catch (error) {
      this.logger.error(
        `Erro ao importar Hybex Essence para empresa ${companyId}:`,
        (error as Error).message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'essence',
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