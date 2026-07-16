import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../prisma/prisma.module';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { OrderCreatedAttributionListener } from './listeners/order-created-attribution.listener';
import { SaleCampaignAttributionProcessor } from './jobs/sale-campaign-attribution.processor';
import { SaleAttributionService } from './application/sale-attribution.service';
import { SaleAttributionController } from './presentation/sale-attribution.controller';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.SALE_CAMPAIGN_ATTRIBUTION,
      defaultJobOptions: {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 5000,
        },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.SALE_CAMPAIGN_ATTRIBUTION,
      adapter: BullAdapter,
    }),
  ],
  controllers: [SaleAttributionController],
  providers: [
    SaleAttributionService,
    ...workerProviders(
      OrderCreatedAttributionListener,
      SaleCampaignAttributionProcessor,
    ),
  ],
})
export class SaleAttributionModule {}
