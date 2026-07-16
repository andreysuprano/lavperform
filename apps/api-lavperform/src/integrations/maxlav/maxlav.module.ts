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
import { MaxlavService } from './api/maxlav.service';
import { MaxlavSalesService } from './application/maxlav-sales.service';
import { MaxlavSalesProcessor } from './infrastructure/jobs/maxlav-sales.processor';
import { MaxlavSaleProcessor } from './infrastructure/jobs/maxlav-sale.processor';
import { MaxlavSalesTasks } from './crons/maxlav-sales-tasks';
import { MaxlavController } from './presentation/maxlav.controller';
import { workerProviders } from '../../common/queue/worker-runtime.config';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    PartnersModule,
    CustomersModule,
    OrderModule,
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.MAXLAV_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.MAXLAV_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.MAXLAV_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.MAXLAV_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [MaxlavController],
  providers: [
    MaxlavService,
    MaxlavSalesService,
    ...workerProviders(
      MaxlavSalesProcessor,
      MaxlavSaleProcessor,
      MaxlavSalesTasks,
    ),
  ],
  exports: [MaxlavService, MaxlavSalesService],
})
export class MaxlavModule {}
