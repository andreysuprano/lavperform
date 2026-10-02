import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { AgidezSalesService } from '../../application/agidez-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface AgidezSalesJobData {
  companyId: string;
  date?: string;
  syncCustomers?: boolean;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
export class AgidezSalesProcessor {
  private readonly logger = new Logger(AgidezSalesProcessor.name);

  constructor(
    private readonly agidezSalesService: AgidezSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.AGIDEZ_SALES_IMPORT, concurrency: 1 })
  async processImport(job: Job<AgidezSalesJobData>) {
    const { companyId, date, syncCustomers, backfill90 } = job.data;

    try {
      if (syncCustomers) {
        this.logger.log(
          `Sincronizando clientes Agidez da empresa ${companyId}`,
        );
        await this.agidezSalesService.syncCustomers(companyId);
      }

      if (backfill90) {
        this.logger.log(
          `Processando backfill de 90 dias Agidez para empresa ${companyId}`,
        );

        const result = await this.agidezSalesService.importHistoricalSales(
          companyId,
          {},
        );

        this.logger.log(
          `Backfill de 90 dias concluído para empresa ${companyId}: ${result.jobsCreated} jobs`,
        );

        return result;
      }

      if (syncCustomers && !date) {
        return;
      }

      if (!date) {
        throw new Error('Job Agidez sem data e sem sync de clientes');
      }

      this.logger.log(
        `Processando importação Agidez para empresa ${companyId} - data: ${date}`,
      );
      await this.agidezSalesService.processDailySales(companyId, date);
    } catch (error) {
      this.logger.error(
        `Erro ao importar Agidez para empresa ${companyId}:`,
        error.message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'agidez',
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
