import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { WindelSalesService } from '../../application/windel-sales.service';
import {
  WindelPerson,
  WindelServiceOrderDetail,
} from '../../api/windel.types';

interface WindelSaleProcessJobData {
  companyId: string;
  order: WindelServiceOrderDetail;
  person: WindelPerson | null;
}

@Processor(QUEUE_NAMES.WINDEL_SALE_PROCESS)
export class WindelSaleProcessor {
  private readonly logger = new Logger(WindelSaleProcessor.name);

  constructor(private readonly windelSalesService: WindelSalesService) {}

  @Process({ name: QUEUE_NAMES.WINDEL_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<WindelSaleProcessJobData>) {
    const { companyId, order, person } = job.data;

    try {
      await this.windelSalesService.processSale(companyId, order, person);
    } catch (error) {
      this.logger.error(
        `Erro ao processar ordem Windel ${order.id} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
