import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { ExpressAdapter } from '@bull-board/express';
import { Module } from '@nestjs/common';
import { MessageBufferModule } from '../messaging/message-buffer.module';
import {
  AUDIO_MESSAGE_HANDLER,
  IMAGE_MESSAGE_HANDLER,
  TEXT_MESSAGE_HANDLER,
  VIDEO_MESSAGE_HANDLER,
} from '../../application/webhook/handlers/message-handler.port';
import { AudioMessageHandler } from '../../application/webhook/handlers/audio-message.handler';
import { ImageMessageHandler } from '../../application/webhook/handlers/image-message.handler';
import { TextMessageHandler } from '../../application/webhook/handlers/text-message.handler';
import { VideoMessageHandler } from '../../application/webhook/handlers/video-message.handler';
import { WEBHOOK_EVENT_REPOSITORY } from '../../application/webhook/ports/webhook-event.repository.port';
import { WEBHOOK_PROVIDER_PORT } from '../../application/webhook/ports/webhook-provider.port';
import { MEDIA_PROCESSOR_PORT } from '../../application/webhook/ports/media-processor.port';
import { ProcessWebhookJobUseCase } from '../../application/webhook/use-cases/process-webhook-job.use-case';
import { MessageNormalizerService } from '../../application/webhook/services/message-normalizer.service';
import { MessageFilterService } from '../../application/webhook/services/message-filter.service';
import { HumanTakeoverService } from '../../application/webhook/services/human-takeover.service';
import { CONVERSATION_REPOSITORY } from '../../application/webhook/ports/conversation.repository.port';
import { PrismaConversationRepository } from '../../infrastructure/persistence/repositories/prisma-conversation.repository';
import { PrismaWebhookEventRepository } from '../../infrastructure/persistence/repositories/prisma-webhook-event.repository';
import { WEBHOOK_QUEUE_NAME } from '../../infrastructure/queue/webhook-queue.constants';
import { WebhookProcessor } from '../../infrastructure/queue/webhook.processor';
import { UazapiWebhookAdapter } from '../../infrastructure/providers/uazapi/uazapi-webhook.adapter';
import { OpenAiMediaService } from '../../infrastructure/providers/openai/openai-media.service';
import { BullSetupModule } from '../messaging/bull.setup.module';
import { AgentModule } from '../agent/agent.module';
import { AgentRunnerModule } from '../agent-runner/agent-runner.module';
import { CustomerJourneyModule } from '../customer-journey/customer-journey.module';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';

/**
 * Para trocar de provider WhatsApp:
 *  1. Crie um novo adapter em infrastructure/providers/<provider>/
 *  2. Substitua UazapiWebhookAdapter pelo novo adapter abaixo.
 *  O restante da aplicação não muda.
 */
@Module({
  imports: [
    BullSetupModule,
    MessageBufferModule,
    BullBoardModule.forRoot({
      route: '/queues',
      adapter: ExpressAdapter,
    }),
    BullBoardModule.forFeature({
      name: WEBHOOK_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    AgentModule,
    AgentRunnerModule,
    CustomerJourneyModule,
  ],
  providers: [
    WebhookProcessor,
    ProcessWebhookJobUseCase,

    PrismaWebhookEventRepository,
    { provide: WEBHOOK_EVENT_REPOSITORY, useExisting: PrismaWebhookEventRepository },

    UazapiWebhookAdapter,
    { provide: WEBHOOK_PROVIDER_PORT, useExisting: UazapiWebhookAdapter },

    OpenAiMediaService,
    { provide: MEDIA_PROCESSOR_PORT, useExisting: OpenAiMediaService },

    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },

    MessageNormalizerService,
    HumanTakeoverService,
    MessageFilterService,

    PrismaConversationRepository,
    { provide: CONVERSATION_REPOSITORY, useExisting: PrismaConversationRepository },

    TextMessageHandler,
    AudioMessageHandler,
    ImageMessageHandler,
    VideoMessageHandler,
    { provide: TEXT_MESSAGE_HANDLER, useExisting: TextMessageHandler },
    { provide: AUDIO_MESSAGE_HANDLER, useExisting: AudioMessageHandler },
    { provide: IMAGE_MESSAGE_HANDLER, useExisting: ImageMessageHandler },
    { provide: VIDEO_MESSAGE_HANDLER, useExisting: VideoMessageHandler },
  ],
})
export class QueueModule {}
