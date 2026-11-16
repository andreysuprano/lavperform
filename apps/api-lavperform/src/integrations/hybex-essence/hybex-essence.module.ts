import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../../prisma/prisma.module';
import { PartnersModule } from '../../partners/partners.module';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { EssenceService } from './api/essence.service';
import { HybexEssenceSalesService } from './application/essence-sales.service';
import { HybexEssenceSalesProcessor } from './infrastructure/jobs/essence-sales.processor';
import { HybexEssenceSaleProcessor } from './infrastructure/jobs/essence-sale.processor';
import { HybexEssenceSalesTasks } from './crons/essence-sales-tasks';
import { HybexEssenceController } from './presentation/hybex-essence.controller';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { SalesImportModule } from '../sales-import/sales-import.module';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    SalesImportModule,
    PartnersModule,
    CustomersModule,
    OrderModule,
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.HYBEX_ESSENCE_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [HybexEssenceController],
  providers: [
    EssenceService,
    HybexEssenceSalesService,
    ...workerProviders(
      HybexEssenceSalesProcessor,
      HybexEssenceSaleProcessor,
      HybexEssenceSalesTasks,
    ),
  ],
  exports: [EssenceService, HybexEssenceSalesService],
})
export class HybexEssenceModule {}