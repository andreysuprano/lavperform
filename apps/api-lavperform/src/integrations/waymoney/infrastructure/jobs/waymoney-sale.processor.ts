import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { WaymoneySalesService } from '../../application/waymoney-sales.service';
import {
  WaymoneyPackagePurchase,
  WaymoneyPayment,
} from '../../api/waymoney.types';

interface WaymoneySaleJobData {
  companyId: string;
  payment?: WaymoneyPayment;
  packagePurchase?: WaymoneyPackagePurchase;
}

@Processor(QUEUE_NAMES.WAYMONEY_SALE_PROCESS)
export class WaymoneySaleProcessor {
  private readonly logger = new Logger(WaymoneySaleProcessor.name);

  constructor(private readonly waymoneySalesService: WaymoneySalesService) {}

  @Process({ name: QUEUE_NAMES.WAYMONEY_SALE_PROCESS, concurrency: 100 })
  async processSale(job: Job<WaymoneySaleJobData>) {
    const { companyId, payment, packagePurchase } = job.data;

    try {
      if (payment) {
        await this.waymoneySalesService.processCycle(companyId, payment);
        return;
      }
      if (packagePurchase) {
        await this.waymoneySalesService.processPackagePurchase(
          companyId,
          packagePurchase,
        );
        return;
      }
      throw new Error(
        `Job WayMoney sem pagamento nem pacote para empresa ${companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Erro ao processar venda WayMoney da empresa ${companyId}:`,
        error instanceof Error ? error.message : error,
      );
      throw error;
    }
  }
}
