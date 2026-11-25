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
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { SalesImportModule } from '../sales-import/sales-import.module';
import { RedisModule } from '../../common/redis/redis.module';
import { SwlService } from './api/swl.service';
import { SwlSalesService } from './application/swl-sales.service';
import { SwlSalesProcessor } from './infrastructure/jobs/swl-sales.processor';
import { SwlSaleProcessor } from './infrastructure/jobs/swl-sale.processor';
import { SwlSalesTasks } from './crons/swl-sales-tasks';
import { SwlController } from './presentation/swl.controller';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    SalesImportModule,
    PartnersModule,
    CustomersModule,
    OrderModule,
    RedisModule,
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.SWL_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          timeout: 3_600_000,
        },
        settings: {
          lockDuration: 300_000,
          stalledInterval: 60_000,
        },
      },
      {
        name: QUEUE_NAMES.SWL_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.SWL_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.SWL_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [SwlController],
  providers: [
    SwlService,
    SwlSalesService,
    ...workerProviders(SwlSalesProcessor, SwlSaleProcessor, SwlSalesTasks),
  ],
  exports: [SwlService, SwlSalesService],
})
export class SwlModule {}
