import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { AgidezSalesService } from '../../application/agidez-sales.service';
import {
  AgidezProduto,
  AgidezServico,
  AgidezTicket,
} from '../../api/agidez.types';

interface AgidezSaleProcessJobData {
  companyId: string;
  ticket: AgidezTicket;
  services: AgidezServico[];
  products: AgidezProduto[];
}

@Processor(QUEUE_NAMES.AGIDEZ_SALE_PROCESS)
export class AgidezSaleProcessor {
  private readonly logger = new Logger(AgidezSaleProcessor.name);

  constructor(private readonly agidezSalesService: AgidezSalesService) {}

  @Process({ name: QUEUE_NAMES.AGIDEZ_SALE_PROCESS, concurrency: 20 })
  async processSale(job: Job<AgidezSaleProcessJobData>) {
    const { companyId, ticket, services, products } = job.data;

    try {
      await this.agidezSalesService.processSale(
        companyId,
        ticket,
        services ?? [],
        products ?? [],
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar ticket Agidez ${ticket.CodigoTicket} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
