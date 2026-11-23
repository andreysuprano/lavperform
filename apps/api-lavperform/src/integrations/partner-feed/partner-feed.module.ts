import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicApiOrderIngestionModule } from '../../public-api/orders/public-api-order-ingestion.module';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { SessionRefreshModule } from '../session-refresh/session-refresh.module';
import { PartnerFeedService } from './partner-feed.service';
import { PartnerFeedTasks } from './partner-feed.tasks';
import { PartnerSalesClient } from './partner-sales.client';

@Module({
  imports: [PrismaModule, HttpModule, SessionRefreshModule, PublicApiOrderIngestionModule],
  providers: [
    PartnerSalesClient,
    PartnerFeedService,
    ...workerProviders(PartnerFeedTasks),
  ],
  exports: [PartnerFeedService],
})
export class PartnerFeedModule {}
