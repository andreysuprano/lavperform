import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { CiccloSalesService } from '../../application/cicclo-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';

interface CiccloSalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.CICCLO_SALES_IMPORT)
export class CiccloSalesProcessor {
  private readonly logger = new Logger(CiccloSalesProcessor.name);

  constructor(
    private readonly ciccloSalesService: CiccloSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.CICCLO_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<CiccloSalesJobData>) {
    const { companyId, date, backfill90 } = job.data;

    try {
      if (backfill90) {
        this.logger.log(
          `Processando backfill de 90 dias Cicclo para empresa ${companyId}`,
        );

        const result = await this.ciccloSalesService.importHistoricalSales(
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
          `Job de importação Cicclo sem data para empresa ${companyId}`,
        );
      }

      this.logger.log(
        `Processando importação Cicclo para empresa ${companyId} - data: ${date}`,
      );

      await this.ciccloSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação Cicclo concluída para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas Cicclo para empresa ${companyId}:`,
        error.message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'cicclo',
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
