import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';
import { VmLavSalesService } from '../../application/vmlav-sales.service';

interface VmLavSalesJobData {
  companyId: string;
  date: string;
}

@Processor(QUEUE_NAMES.VMLAV_SALES_IMPORT)
export class VmLavSalesProcessor {
  private readonly logger = new Logger(VmLavSalesProcessor.name);

  constructor(
    private readonly vmLavSalesService: VmLavSalesService,
  ) {}

  @Process({ name: QUEUE_NAMES.VMLAV_SALES_IMPORT, concurrency: 50 })
  async processSalesImport(job: Job<VmLavSalesJobData>) {
    const { companyId, date } = job.data;

    try {
      this.logger.log(
        `Processando importação de vendas VM Lav para empresa ${companyId} - data: ${date}`,
      );

      await this.vmLavSalesService.processDailySales(companyId, date);

      this.logger.log(
        `Importação de vendas concluída para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar importação de vendas para empresa ${companyId}:`,
        error.message,
      );
      throw error;
    }
  }
}
