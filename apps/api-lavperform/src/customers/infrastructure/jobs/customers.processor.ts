import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { CustomersService } from '../../application/customers.service';
import { CreateCustomerDto } from '../../application/dto/create-customer.dto';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { Logger } from '@nestjs/common';

@Processor(QUEUE_NAMES.CUSTOMERS_IMPORT)
export class CustomersProcessor {
  private readonly logger = new Logger(CustomersProcessor.name);

  constructor(private readonly customersService: CustomersService) { }

  @Process({ name: 'import', concurrency: 500 })
  async handleImport(job: Job<{ companyId: string; customer: CreateCustomerDto }>) {
    this.logger.log(`Processando job ${job.id}`);
    const { companyId, customer } = job.data;

    try {
      await this.customersService.create(companyId, customer);
      this.logger.log(`Job ${job.id} processado com sucesso`);
      return { success: true };
    } catch (error) {
      this.logger.error(`Erro ao processar job ${job.id}: ${error.message}`);

      // Se o job já tentou 3 vezes, move para a fila de falhas
      if (job.attemptsMade >= 3) {
        this.logger.error(`Job ${job.id} falhou após 3 tentativas. Movendo para fila de falhas.`);
        throw error;
      }

      // Se ainda não atingiu o limite de tentativas, tenta novamente
      throw error;
    }
  }
} 