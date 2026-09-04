import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { AutomaticCampaignService } from './application/automatic-campaign.service';
import { AutomaticCampaignController } from './presentation/automatic-campaign.controller';
import { AutomaticCampaignTasks } from './crons/automatic-campaign-tasks';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { AutomaticCampaignsProcessor } from './infrastructure/jobs/automatic-campaigns.processor';
import { OpenAIService } from '../integrations/openai/api/openai.service';
import { AutomaticCampaignPrismaRepository } from './infrastructure/persistence/prisma-automatic-campaign.repository';
import { CampaignChannelStrategyFactory } from './infrastructure/strategies/campaign-channel-strategy.factory';
import { WhatsappWebStrategy } from './infrastructure/strategies/whatsapp-web.strategy';
import { WhatsappBusinessApiStrategy } from './infrastructure/strategies/whatsapp-business-api.strategy';
import { SmsStrategy } from './infrastructure/strategies/sms.strategy';
import { RcsStrategy } from './infrastructure/strategies/rcs.strategy';
import { EmailStrategy } from './infrastructure/strategies/email.strategy';
import { PushNotificationStrategy } from './infrastructure/strategies/push-notification.strategy';
import { MetaIntegrationModule } from '../integrations/meta/meta-integration.module';
import { workerProviders } from '../common/queue/worker-runtime.config';
import { RenitencyModule } from '../renitency/renitency.module';
import { AudiencesModule } from '../audiences/audiences.module';
import { CustomSendListsModule } from '../custom-send-lists/custom-send-lists.module';
import { CustomersModule } from '../customers/customers.module';
import { MessageCostModule } from '../message-engine/pricing/message-cost.module';
import { WhatsappModule } from '../whatsapp/whatsapp.module';

@Module({
  imports: [
    HttpModule,
    MetaIntegrationModule,
    RenitencyModule,
    AudiencesModule,
    CustomSendListsModule,
    CustomersModule,
    WhatsappModule,
    MessageCostModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
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
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      adapter: BullAdapter,
    })],
  controllers: [AutomaticCampaignController],
  providers: [
    AutomaticCampaignService,
    OpenAIService,
    CampaignChannelStrategyFactory,
    WhatsappWebStrategy,
    WhatsappBusinessApiStrategy,
    SmsStrategy,
    RcsStrategy,
    EmailStrategy,
    PushNotificationStrategy,
    ...workerProviders(
      AutomaticCampaignTasks,
      AutomaticCampaignsProcessor,
    ),
    {
      provide: 'IAutomaticCampaignRepository',
      useClass: AutomaticCampaignPrismaRepository
    }
  ],
  exports: [AutomaticCampaignService],
})
export class AutomaticCampaignModule { }
