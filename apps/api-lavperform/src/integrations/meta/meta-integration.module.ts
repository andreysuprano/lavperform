import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { MetaIntegrationService } from './meta-integration.service';
import { MetaIntegrationController } from './presentation/meta-integration.controller';
import { MetaGraphClient } from './api/meta-graph.client';
import { MetaMessagingClient } from './api/meta-messaging.client';
import { MetaTemplatesClient } from './api/meta-templates.client';
import { MetaMessagingService } from './application/meta-messaging.service';
import { MetaTemplatesService } from './application/meta-templates.service';
import { MetaTemplatesController } from './presentation/meta-templates.controller';
import { MetaTemplatesSyncTasks } from './crons/meta-templates-sync.tasks';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
    }),
  ],
  controllers: [MetaIntegrationController, MetaTemplatesController],
  providers: [
    MetaIntegrationService,
    MetaGraphClient,
    MetaMessagingClient,
    MetaTemplatesClient,
    MetaMessagingService,
    MetaTemplatesService,
    MetaTemplatesSyncTasks,
  ],
  exports: [
    MetaIntegrationService,
    MetaGraphClient,
    MetaMessagingService,
    MetaTemplatesService,
  ],
})
export class MetaIntegrationModule {}
