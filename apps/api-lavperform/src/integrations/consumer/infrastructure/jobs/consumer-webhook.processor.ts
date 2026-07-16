import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Logger } from '@nestjs/common';
import { QUEUE_NAMES } from '../../../../common/queue/queue.constants';
import { CONSUMER_WEBHOOK_JOB_NAME } from '../../consumer-webhook-jobs.constants';
import { ConsumerWebhookService } from '../../application/consumer-webhook.service';
import type { ConsumerWebhookPayload } from '../../dto/consumer-webhook-payload.interface';

export interface ConsumerWebhookProcessJobData {
  companyId: string;
  consumerPartnerId: string;
  payload: ConsumerWebhookPayload;
}

@Processor(QUEUE_NAMES.CONSUMER_WEBHOOK_PROCESS)
export class ConsumerWebhookProcessor {
  private readonly logger = new Logger(ConsumerWebhookProcessor.name);

  constructor(private readonly consumerWebhookService: ConsumerWebhookService) {}

  @Process({
    name: CONSUMER_WEBHOOK_JOB_NAME,
    concurrency: 10,
  })
  async handle(job: Job<ConsumerWebhookProcessJobData>) {
    const { companyId, consumerPartnerId, payload } = job.data;

    this.logger.log(
      `Job Consumer webhook ${job.id} empresa=${companyId} pedido=${payload.pedido?.codigo ?? '?'}`,
    );

    try {
      await this.consumerWebhookService.processFinalizedWebhookOrder(
        companyId,
        consumerPartnerId,
        payload,
      );
    } catch (error) {
      const maxAttempts = job.opts.attempts ?? 1;
      this.logger.error(
        `Falha no job Consumer webhook ${job.id} (tentativa ${job.attemptsMade + 1}/${maxAttempts}):`,
        error,
      );
      throw error;
    }
  }
}
