import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { AutomaticCampaignModule } from '../../automatic-campaign/automatic-campaign.module';
import { AdminCampaignsService } from './admin-campaigns.service';
import { AdminCampaignsController } from './admin-campaigns.controller';
import { AdminAutomaticCampaignsService } from './admin-automatic-campaigns.service';
import { AdminAutomaticCampaignsController } from './admin-automatic-campaigns.controller';

@Module({
  imports: [
    PrismaModule,
    AutomaticCampaignModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CAMPAIGNS_ENGINE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 500 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    AdminCampaignsController,
    AdminAutomaticCampaignsController,
  ],
  providers: [
    AdminCampaignsService,
    AdminAutomaticCampaignsService,
  ],
})
export class AdminCampaignsModule {}
