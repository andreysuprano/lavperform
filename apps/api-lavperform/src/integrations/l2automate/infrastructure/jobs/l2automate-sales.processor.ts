import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { L2AutomateSalesService } from '../../application/l2automate-sales.service';

interface L2AutomateSalesJobData {
  companyId: string;
  date: string;
}

@Processor(QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT)
export class L2AutomateSalesProcessor {
  private readonly logger = new Logger(L2AutomateSalesProcessor.name);

  constructor(
    private readonly l2AutomateSalesService: L2AutomateSalesService,
  ) {}

  @Process({ name: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT, concurrency: 5 })
  async processSalesImport(job: Job<L2AutomateSalesJobData>) {
    const { companyId, date } = job.data;

    try {
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
      throw error;
    }
  }
}
