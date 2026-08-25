import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { workerProviders } from '../common/queue/worker-runtime.config';
import { OrderDeduplicationService } from './application/order-deduplication.service';
import { CampaignAttributionDeduplicationService } from './application/campaign-attribution-deduplication.service';
import { DeduplicationProcessor } from './infrastructure/jobs/deduplication.processor';
import { CustomerDuplicateService } from './application/customer-duplicate.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.DATA_DEDUPLICATION,
        limiter: {
          max: 20,
          duration: 60_000,
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      { name: QUEUE_NAMES.RFV_CALCULATION },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.DATA_DEDUPLICATION,
      adapter: BullAdapter,
    }),
  ],
  providers: [
    OrderDeduplicationService,
    CampaignAttributionDeduplicationService,
    CustomerDuplicateService,
    ...workerProviders(DeduplicationProcessor),
  ],
  exports: [
    OrderDeduplicationService,
    CampaignAttributionDeduplicationService,
    CustomerDuplicateService,
  ],
})
export class DeduplicationModule {}
