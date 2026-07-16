import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { MessageProcessor } from './processor/message-processor';
import { OpenAIModule } from 'src/integrations/openai/openai.module';
import { WhatsappModule } from 'src/whatsapp/whatsapp.module';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MessageTasks } from './cron/message-task';
import { BullModule } from '@nestjs/bull';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaService } from 'src/prisma/prisma.service';
import { MetaIntegrationModule } from 'src/integrations/meta/meta-integration.module';
import { DisparoProModule } from 'src/integrations/disparo-pro/disparo-pro.module';
import { workerProviders } from 'src/common/queue/worker-runtime.config';
import { RenitencyModule } from 'src/renitency/renitency.module';
@Module({
  imports: [HttpModule,
    PrismaModule,
    OpenAIModule,
    WhatsappModule,
    MetaIntegrationModule,
    DisparoProModule,
    RenitencyModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.MESSAGE_ENGINE,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 500,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.MESSAGE_ENGINE,
      adapter: BullAdapter,
    }),
  ],
  providers: [
    PrismaService,
    ...workerProviders(
      MessageProcessor,
      MessageTasks,
    ),
  ],
  exports: [MessageProcessor],
})
export class MessageEngineModule { } 