import { Logger } from '@nestjs/common';
import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from '../../../common/queue/queue.constants';
import { CreditsService } from '../../application/credits.service';
import { ASAAS_PAYMENT_PROCESS_JOB_NAME } from '../../application/credits.constants';

export interface AsaasPaymentProcessJobData {
  payload: Record<string, unknown>;
}

@Processor(QUEUE_NAMES.ASAAS_PAYMENT_PROCESS)
export class AsaasPaymentProcessor {
  private readonly logger = new Logger(AsaasPaymentProcessor.name);

  constructor(private readonly creditsService: CreditsService) {}

  @Process({
    name: ASAAS_PAYMENT_PROCESS_JOB_NAME,
    concurrency: 5,
  })
  async handle(job: Job<AsaasPaymentProcessJobData>) {
    this.logger.log(`Processando webhook Asaas job=${job.id}`);
    await this.creditsService.processAsaasPaymentWebhook(job.data.payload);
  }
}
