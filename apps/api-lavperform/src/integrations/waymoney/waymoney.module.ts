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
import { WaymoneyService } from './api/waymoney.service';
import { WaymoneySalesService } from './application/waymoney-sales.service';
import { WaymoneySalesProcessor } from './infrastructure/jobs/waymoney-sales.processor';
import { WaymoneySaleProcessor } from './infrastructure/jobs/waymoney-sale.processor';
import { WaymoneySalesTasks } from './crons/waymoney-sales-tasks';
import { WaymoneyController } from './presentation/waymoney.controller';

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
        name: QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.WAYMONEY_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.WAYMONEY_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [WaymoneyController],
  providers: [
    WaymoneyService,
    WaymoneySalesService,
    ...workerProviders(
      WaymoneySalesProcessor,
      WaymoneySaleProcessor,
      WaymoneySalesTasks,
    ),
  ],
  exports: [WaymoneyService, WaymoneySalesService],
})
export class WaymoneyModule {}
