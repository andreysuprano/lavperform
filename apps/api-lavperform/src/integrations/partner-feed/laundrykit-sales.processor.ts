import { Processor, Process } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { PartnerFeedService } from './partner-feed.service';

interface LaundryKitSalesJobData {
  companyId: string;
  date: string;
}

@Processor(QUEUE_NAMES.LAUNDRYKIT_SALES_IMPORT)
export class LaundryKitSalesProcessor {
  private readonly logger = new Logger(LaundryKitSalesProcessor.name);

  constructor(private readonly feed: PartnerFeedService) {}

  @Process({ name: QUEUE_NAMES.LAUNDRYKIT_SALES_IMPORT, concurrency: 1 })
  async processDay(job: Job<LaundryKitSalesJobData>) {
    const { companyId, date } = job.data;
    this.logger.log(
      `Importando vendas Laundry Kit da empresa ${companyId} em ${date}`,
    );
    await this.feed.importDay(companyId, date);
  }
}
