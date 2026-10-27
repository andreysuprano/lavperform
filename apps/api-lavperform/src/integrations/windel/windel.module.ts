import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { WindelService } from './api/windel.service';
import { WindelSalesService } from './application/windel-sales.service';
import { WindelSalesProcessor } from './infrastructure/jobs/windel-sales.processor';
import { WindelSaleProcessor } from './infrastructure/jobs/windel-sale.processor';
import { WindelSalesTasks } from './crons/windel-sales-tasks';
import { WindelController } from './presentation/windel.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PartnersModule } from '../../partners/partners.module';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { SalesImportModule } from '../sales-import/sales-import.module';
import { RedisModule } from '../../common/redis/redis.module';

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
        name: QUEUE_NAMES.WINDEL_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.WINDEL_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.WINDEL_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.WINDEL_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [WindelController],
  providers: [
    WindelService,
    WindelSalesService,
    ...workerProviders(
      WindelSalesProcessor,
      WindelSaleProcessor,
      WindelSalesTasks,
    ),
  ],
  exports: [WindelService, WindelSalesService],
})
export class WindelModule {}
