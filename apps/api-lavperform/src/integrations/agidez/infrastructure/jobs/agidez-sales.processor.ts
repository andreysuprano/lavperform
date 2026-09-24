import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { AgidezSalesService } from '../../application/agidez-sales.service';

interface AgidezSalesJobData {
  companyId: string;
  date?: string;
  syncCustomers?: boolean;
}

@Processor(QUEUE_NAMES.AGIDEZ_SALES_IMPORT)
export class AgidezSalesProcessor {
  private readonly logger = new Logger(AgidezSalesProcessor.name);

  constructor(private readonly agidezSalesService: AgidezSalesService) {}

  @Process({ name: QUEUE_NAMES.AGIDEZ_SALES_IMPORT, concurrency: 2 })
  async processImport(job: Job<AgidezSalesJobData>) {
    const { companyId, date, syncCustomers } = job.data;

    try {
      if (syncCustomers) {
        this.logger.log(`Sincronizando clientes Agidez da empresa ${companyId}`);
        await this.agidezSalesService.syncCustomers(companyId);
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
      throw error;
    }
  }
}
