import { Module } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import { WEBHOOK_EVENT_REPOSITORY } from '../../application/webhook/ports/webhook-event.repository.port';
import { WEBHOOK_PROVIDER_PORT } from '../../application/webhook/ports/webhook-provider.port';
import { WEBHOOK_QUEUE_PORT } from '../../application/webhook/ports/webhook-queue.port';
import { ReceiveWebhookUseCase } from '../../application/webhook/use-cases/receive-webhook.use-case';
import { WebhookController } from '../../infrastructure/http/webhook/webhook.controller';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';
import { PrismaWebhookEventRepository } from '../../infrastructure/persistence/repositories/prisma-webhook-event.repository';
import { UazapiWebhookAdapter } from '../../infrastructure/providers/uazapi/uazapi-webhook.adapter';
import { BullWebhookQueueAdapter } from '../../infrastructure/queue/bull-webhook-queue.adapter';
import { AttendanceModule } from '../attendance/attendance.module';
import { BullSetupModule } from '../messaging/bull.setup.module';
import { MessageBufferModule } from '../messaging/message-buffer.module';

@Module({
  imports: [BullSetupModule, MessageBufferModule, AttendanceModule],
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
    PrismaAgentRepository,
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },
    UazapiWebhookAdapter,
    { provide: WEBHOOK_PROVIDER_PORT, useExisting: UazapiWebhookAdapter },
  ],
})
export class WebhookModule {}
