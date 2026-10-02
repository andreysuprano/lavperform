import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { MaxlavSalesService } from '../../application/maxlav-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface MaxlavSalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.MAXLAV_SALES_IMPORT)
export class MaxlavSalesProcessor {
  private readonly logger = new Logger(MaxlavSalesProcessor.name);

  constructor(
    private readonly maxlavSalesService: MaxlavSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.MAXLAV_SALES_IMPORT, concurrency: 1 })
  async processDailySales(job: Job<MaxlavSalesJobData>) {
    const { companyId, date, backfill90 } = job.data;

    try {
      if (backfill90) {
        this.logger.log(
          `Processando backfill de 90 dias Maxlav para empresa ${companyId}`,
        );

        const result = await this.maxlavSalesService.importHistoricalSales(
          companyId,
          {},
        );

        this.logger.log(
          `Backfill de 90 dias concluído para empresa ${companyId}: ${result.jobsCreated} jobs`,
        );

        return result;
      }

      if (!date) {
        throw new Error(
          `Job de importação Maxlav sem data para empresa ${companyId}`,
        );
      }

      this.logger.log(
        `Processando importação Maxlav para empresa ${companyId} - data: ${date}`,
      );

      await this.maxlavSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação Maxlav concluída para empresa ${companyId} - ${date}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas Maxlav para empresa ${companyId}${date ? ` - ${date}` : ''}:`,
        error.message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'maxlav',
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
