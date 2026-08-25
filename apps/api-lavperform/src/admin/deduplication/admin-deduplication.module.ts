import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../../prisma/prisma.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { OrderDeduplicationService } from '../../deduplication/application/order-deduplication.service';
import { CampaignAttributionDeduplicationService } from '../../deduplication/application/campaign-attribution-deduplication.service';
import { AdminDeduplicationController } from './admin-deduplication.controller';
import { AdminDeduplicationService } from './admin-deduplication.service';
import { CustomerDuplicateService } from '../../deduplication/application/customer-duplicate.service';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.DATA_DEDUPLICATION,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      { name: QUEUE_NAMES.RFV_CALCULATION },
    ),
  ],
  controllers: [AdminDeduplicationController],
  providers: [
    OrderDeduplicationService,
    CampaignAttributionDeduplicationService,
    CustomerDuplicateService,
    AdminDeduplicationService,
  ],
})
export class AdminDeduplicationModule {}
