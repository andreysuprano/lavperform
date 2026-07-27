import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { VmLavSalesService } from '../../application/vmlav-sales.service';
import { VmLavSale } from '../../api/vmlav.types';

interface VmLavSaleProcessJobData {
  companyId: string;
  sale: VmLavSale;
  apiKey: string;
  partnerId: string;
}

@Processor(QUEUE_NAMES.VMLAV_SALE_PROCESS)
export class VmLavSaleProcessor {
  private readonly logger = new Logger(VmLavSaleProcessor.name);

  constructor(
    private readonly vmLavSalesService: VmLavSalesService,
  ) {}

  @Process({ name: QUEUE_NAMES.VMLAV_SALE_PROCESS, concurrency: 50 })
  async processSale(job: Job<VmLavSaleProcessJobData>) {
    const { companyId, sale, apiKey, partnerId } = job.data;

    try {
      await this.vmLavSalesService.processSale(
        companyId,
        sale,
        apiKey,
        partnerId,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda ${sale.idVenda} da empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
