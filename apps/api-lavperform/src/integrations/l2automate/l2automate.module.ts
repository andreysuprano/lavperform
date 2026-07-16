import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { L2AutomateService } from './api/l2automate.service';
import { L2AutomateSalesService } from './application/l2automate-sales.service';
import { L2AutomateSalesProcessor } from './infrastructure/jobs/l2automate-sales.processor';
import { L2AutomateSaleProcessor } from './infrastructure/jobs/l2automate-sale.processor';
import { L2AutomateSalesTasks } from './crons/l2automate-sales-tasks';
import { L2AutomateController } from './presentation/l2automate.controller';
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
        name: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
      {
        name: QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
        },
      },
    ),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT,
      adapter: BullAdapter,
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.L2AUTOMATE_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [L2AutomateController],
  providers: [
    L2AutomateService,
    L2AutomateSalesService,
    ...workerProviders(
      L2AutomateSalesProcessor,
      L2AutomateSaleProcessor,
      L2AutomateSalesTasks,
    ),
  ],
  exports: [L2AutomateService, L2AutomateSalesService],
})
export class L2AutomateModule {}
