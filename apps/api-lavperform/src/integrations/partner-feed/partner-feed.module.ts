import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicApiOrderIngestionModule } from '../../public-api/orders/public-api-order-ingestion.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { SessionRefreshModule } from '../session-refresh/session-refresh.module';
import { LaundryKitHistoryController } from './laundrykit-history.controller';
import { LaundryKitSalesProcessor } from './laundrykit-sales.processor';
import { PartnerFeedService } from './partner-feed.service';
import { PartnerFeedTasks } from './partner-feed.tasks';
import { PartnerSalesClient } from './partner-sales.client';

@Module({
  imports: [
    PrismaModule,
    HttpModule,
    SessionRefreshModule,
    PublicApiOrderIngestionModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.LAUNDRYKIT_SALES_IMPORT,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
      },
    }),
  ],
  controllers: [LaundryKitHistoryController],
  providers: [
    PartnerSalesClient,
    PartnerFeedService,
    ...workerProviders(PartnerFeedTasks, LaundryKitSalesProcessor),
  ],
  exports: [PartnerFeedService],
})
export class PartnerFeedModule {}
