import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { CiccloService } from './api/cicclo.service';
import { CiccloSalesService } from './application/cicclo-sales.service';
import { CiccloSalesProcessor } from './infrastructure/jobs/cicclo-sales.processor';
import { CiccloSaleProcessor } from './infrastructure/jobs/cicclo-sale.processor';
import { CiccloSalesTasks } from './crons/cicclo-sales-tasks';
import { CiccloController } from './presentation/cicclo.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PartnersModule } from '../../partners/partners.module';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
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
        name: QUEUE_NAMES.CICCLO_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.CICCLO_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CICCLO_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CICCLO_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [CiccloController],
  providers: [
    CiccloService,
    CiccloSalesService,
    ...workerProviders(
      CiccloSalesProcessor,
      CiccloSaleProcessor,
      CiccloSalesTasks,
    ),
  ],
  exports: [CiccloService, CiccloSalesService],
})
export class CiccloModule {}
