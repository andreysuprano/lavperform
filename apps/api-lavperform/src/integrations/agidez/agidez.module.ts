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
import { AgidezService } from './api/agidez.service';
import { AgidezSalesService } from './application/agidez-sales.service';
import { AgidezSalesProcessor } from './infrastructure/jobs/agidez-sales.processor';
import { AgidezSaleProcessor } from './infrastructure/jobs/agidez-sale.processor';
import { AgidezSalesTasks } from './crons/agidez-sales-tasks';
import { AgidezController } from './presentation/agidez.controller';
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
        name: QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.AGIDEZ_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.AGIDEZ_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [AgidezController],
  providers: [
    AgidezService,
    AgidezSalesService,
    ...workerProviders(
      AgidezSalesProcessor,
      AgidezSaleProcessor,
      AgidezSalesTasks,
    ),
  ],
  exports: [AgidezService, AgidezSalesService],
})
export class AgidezModule {}
