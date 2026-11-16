import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { HybexEssenceSalesService } from '../../application/essence-sales.service';
import { EssenceTicket } from '../../api/essence.types';

interface EssenceSaleProcessJobData {
  companyId: string;
  ticket: EssenceTicket;
  storeGuid: string;
}

@Processor(QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS)
export class HybexEssenceSaleProcessor {
  private readonly logger = new Logger(HybexEssenceSaleProcessor.name);

  constructor(private readonly essenceSalesService: HybexEssenceSalesService) {}

  @Process({ name: QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS, concurrency: 20 })
  async processSale(job: Job<EssenceSaleProcessJobData>) {
    const { companyId, ticket, storeGuid } = job.data;

    try {
      await this.essenceSalesService.processSale(companyId, ticket, storeGuid);
    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket Essence ${ticket.Sequencia} da empresa ${companyId}:`,
        (error as Error).message,
      );
      throw error;
    }
  }
}