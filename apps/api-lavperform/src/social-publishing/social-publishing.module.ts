import { BullAdapter } from '@bull-board/api/bullAdapter';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullModule } from '@nestjs/bull';
import { Module } from '@nestjs/common';

import { GoogleSocialClient } from './clients/google-social.client';
import { MetaSocialClient } from './clients/meta-social.client';
import { PublishScheduledPostsTasks } from './crons/publish-scheduled-posts.tasks';
import { IntegrationsConfigService } from './integrations.config';
import { PublishScheduledPostsProcessor } from './processors/publish-scheduled-posts.processor';
import { ScheduledPostsService } from './scheduled-posts.service';
import { SocialConnectionsService } from './social-connections.service';
import {
  SocialOauthController,
  SocialPublishingController,
} from './social-publishing.controller';
import { SocialPublishDispatcher } from './social-publish.dispatcher';
import { TokenCipher } from './token-cipher';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    BullModule.registerQueue({
      name: QUEUE_NAMES.SOCIAL_POST_PUBLISH,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 30_000 },
        removeOnComplete: true,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.SOCIAL_POST_PUBLISH,
      adapter: BullAdapter,
    }),
  ],
  controllers: [SocialPublishingController, SocialOauthController],
  providers: [
    IntegrationsConfigService,
    TokenCipher,
    MetaSocialClient,
    GoogleSocialClient,
    SocialConnectionsService,
    ScheduledPostsService,
    SocialPublishDispatcher,
    ...workerProviders(
      PublishScheduledPostsTasks,
      PublishScheduledPostsProcessor,
    ),
  ],
  exports: [SocialConnectionsService, ScheduledPostsService],
})
export class SocialPublishingModule {}
