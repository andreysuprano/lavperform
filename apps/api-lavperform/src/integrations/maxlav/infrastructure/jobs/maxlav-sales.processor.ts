import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { MaxlavSalesService } from '../../application/maxlav-sales.service';

interface MaxlavSalesJobData {
  companyId: string;
  date: string;
}

@Processor(QUEUE_NAMES.MAXLAV_SALES_IMPORT)
export class MaxlavSalesProcessor {
  private readonly logger = new Logger(MaxlavSalesProcessor.name);

  constructor(private readonly maxlavSalesService: MaxlavSalesService) {}

  @Process({ name: QUEUE_NAMES.MAXLAV_SALES_IMPORT, concurrency: 5 })
  async processDailySales(job: Job<MaxlavSalesJobData>) {
    const { companyId, date } = job.data;

    try {
      this.logger.log(
        `Processando importação Maxlav para empresa ${companyId} - data: ${date}`,
      );

      await this.maxlavSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação Maxlav concluída para empresa ${companyId} - ${date}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao importar vendas Maxlav para empresa ${companyId} - ${date}:`,
        error.message,
      );
      throw error;
    }
  }
}
