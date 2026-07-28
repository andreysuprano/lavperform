import { Module } from '@nestjs/common';
import { WEBHOOK_EVENT_REPOSITORY } from '../../application/webhook/ports/webhook-event.repository.port';
import { WEBHOOK_QUEUE_PORT } from '../../application/webhook/ports/webhook-queue.port';
import { ReceiveWebhookUseCase } from '../../application/webhook/use-cases/receive-webhook.use-case';
import { WebhookController } from '../../infrastructure/http/webhook/webhook.controller';
import { PrismaWebhookEventRepository } from '../../infrastructure/persistence/repositories/prisma-webhook-event.repository';
import { BullWebhookQueueAdapter } from '../../infrastructure/queue/bull-webhook-queue.adapter';
import { BullSetupModule } from '../messaging/bull.setup.module';
import { MessageBufferModule } from '../messaging/message-buffer.module';

@Module({
  imports: [BullSetupModule, MessageBufferModule],
  controllers: [WebhookController],
  providers: [
    ReceiveWebhookUseCase,
    PrismaWebhookEventRepository,
    BullWebhookQueueAdapter,
    {
      provide: WEBHOOK_EVENT_REPOSITORY,
      useExisting: PrismaWebhookEventRepository,
    },
    {
      provide: WEBHOOK_QUEUE_PORT,
      useExisting: BullWebhookQueueAdapter,
    },
  ],
})
export class WebhookModule {}
