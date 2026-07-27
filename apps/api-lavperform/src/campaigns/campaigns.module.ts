import { Module } from '@nestjs/common';
import { CampaignsService } from './application/campaigns.service';
import { CampaignsController } from './presentation/campaigns.controller';
import { ScheduledCampaignTasks } from './crons/scheduled-campaign-tasks';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullModule } from '@nestjs/bull';
import { CampaignsProcessor } from './infrastructure/jobs/campaigns.processor';
import { MessageEngineModule } from '../message-engine/message-engine.module';
import { OpenAIModule } from '../integrations/openai/openai.module';
import { CampaignPrismaRepository } from './infrastructure/persistence/prisma-campaign.repository';
import { AudiencesModule } from '../audiences/audiences.module';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    AudiencesModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CAMPAIGNS_ENGINE,
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
      name: QUEUE_NAMES.CAMPAIGNS_ENGINE,
      adapter: BullAdapter,
    }),
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
    MessageEngineModule,
    OpenAIModule,
  ],
  controllers: [CampaignsController],
  providers: [
    CampaignsService,
    ...workerProviders(
      ScheduledCampaignTasks,
      CampaignsProcessor,
    ),
    {
      provide: 'ICampaignRepository',
      useClass: CampaignPrismaRepository
    }
  ],
  exports: [CampaignsService],
})
export class CampaignsModule { } 