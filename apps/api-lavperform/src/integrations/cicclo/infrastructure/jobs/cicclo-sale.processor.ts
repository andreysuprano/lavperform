import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { CiccloSalesService } from '../../application/cicclo-sales.service';
import { CiccloSale } from '../../api/cicclo.types';

interface CiccloSaleProcessJobData {
  companyId: string;
  sale: CiccloSale;
}

@Processor(QUEUE_NAMES.CICCLO_SALE_PROCESS)
export class CiccloSaleProcessor {
  private readonly logger = new Logger(CiccloSaleProcessor.name);

  constructor(private readonly ciccloSalesService: CiccloSalesService) {}

  @Process({ name: QUEUE_NAMES.CICCLO_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<CiccloSaleProcessJobData>) {
    const { companyId, sale } = job.data;

    try {
      await this.ciccloSalesService.processSale(companyId, sale);
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda Cicclo ${sale.id} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
