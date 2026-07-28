import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { WebhookQueuePort } from '../../application/webhook/ports/webhook-queue.port';
import { WEBHOOK_QUEUE_NAME } from './webhook-queue.constants';

@Injectable()
export class BullWebhookQueueAdapter implements WebhookQueuePort {
  constructor(
    @InjectQueue(WEBHOOK_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async enqueue(webhookEventId: string, agentId: string): Promise<string> {
    const job = await this.queue.add(
      'process',
      { webhookEventId, agentId },
      { removeOnComplete: 100, removeOnFail: 500 },
    );
    return String(job.id);
  }
}
