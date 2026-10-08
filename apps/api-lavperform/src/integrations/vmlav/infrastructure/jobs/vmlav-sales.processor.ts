import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { VmLavSalesService } from '../../application/vmlav-sales.service';
import {
  isSalesImportLastAttempt,
  SalesImportAlertService,
} from '../../../sales-import/sales-import-alert.service';
import { weeklyReplayRange } from '../../../sales-import/sales-import-schedule';

interface VmLavSalesJobData {
  companyId: string;
  date?: string;
  backfill90?: boolean;
}

@Processor(QUEUE_NAMES.VMLAV_SALES_IMPORT)
export class VmLavSalesProcessor {
  private readonly logger = new Logger(VmLavSalesProcessor.name);

  constructor(
    private readonly vmLavSalesService: VmLavSalesService,
    private readonly alert: SalesImportAlertService,
  ) {}

  @Process({ name: QUEUE_NAMES.VMLAV_SALES_IMPORT, concurrency: 1 })
  async processSalesImport(job: Job<VmLavSalesJobData>) {
    const { companyId, date, backfill90 } = job.data;

    try {
      if (backfill90) {
        this.logger.log(
          `Processando reexecução de 7 dias VM Lav para empresa ${companyId}`,
        );

        const result = await this.vmLavSalesService.importHistoricalSales(
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
          `Job de importação VM Lav sem data para empresa ${companyId}`,
        );
      }

      this.logger.log(
        `Processando importação de vendas VM Lav para empresa ${companyId} - data: ${date}`,
      );

      const result = await this.vmLavSalesService.processDailySales(
        companyId,
        date,
      );

      this.logger.log(
        `Importação de vendas concluída para empresa ${companyId}: ` +
          `${result.salesFound} encontradas, ${result.enqueued} enfileiradas (CNPJ ${result.cnpj})`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `Erro ao processar importação de vendas para empresa ${companyId}:`,
        error.message,
      );

      if (isSalesImportLastAttempt(job)) {
        await this.alert.notify({
          partner: 'vmlav',
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
