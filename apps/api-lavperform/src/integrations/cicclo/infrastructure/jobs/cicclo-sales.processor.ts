import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { CiccloSalesService } from '../../application/cicclo-sales.service';

interface CiccloSalesJobData {
  companyId: string;
  date: string;
}

@Processor(QUEUE_NAMES.CICCLO_SALES_IMPORT)
export class CiccloSalesProcessor {
  private readonly logger = new Logger(CiccloSalesProcessor.name);

  constructor(private readonly ciccloSalesService: CiccloSalesService) {}

  @Process({ name: QUEUE_NAMES.CICCLO_SALES_IMPORT, concurrency: 5 })
  async processSalesImport(job: Job<CiccloSalesJobData>) {
    const { companyId, date } = job.data;

    try {
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
      throw error;
    }
  }
}
