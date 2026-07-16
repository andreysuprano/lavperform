import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { L2AutomateSalesService } from '../../application/l2automate-sales.service';
import { L2AutomateSale } from '../../api/l2automate.types';

interface L2AutomateSaleProcessJobData {
  companyId: string;
  sale: L2AutomateSale;
}

@Processor(QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS)
export class L2AutomateSaleProcessor {
  private readonly logger = new Logger(L2AutomateSaleProcessor.name);

  constructor(
    private readonly l2AutomateSalesService: L2AutomateSalesService,
  ) {}

  @Process({ name: QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<L2AutomateSaleProcessJobData>) {
    const { companyId, sale } = job.data;

    try {
      await this.l2AutomateSalesService.processSale(companyId, sale);
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda L2 Automate ${sale.id} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
