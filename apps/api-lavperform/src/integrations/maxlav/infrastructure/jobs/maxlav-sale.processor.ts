import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { MaxlavSalesService } from '../../application/maxlav-sales.service';
import { MaxlavOrder } from '../../api/maxlav.types';

interface MaxlavSaleProcessJobData {
  companyId: string;
  order: MaxlavOrder;
}

@Processor(QUEUE_NAMES.MAXLAV_SALE_PROCESS)
export class MaxlavSaleProcessor {
  private readonly logger = new Logger(MaxlavSaleProcessor.name);

  constructor(private readonly maxlavSalesService: MaxlavSalesService) {}

  @Process({ name: QUEUE_NAMES.MAXLAV_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<MaxlavSaleProcessJobData>) {
    const { companyId, order } = job.data;

    try {
      await this.maxlavSalesService.processSale(companyId, order);
    } catch (error) {
      this.logger.error(
        `Erro ao processar pedido Maxlav ${order.id} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
