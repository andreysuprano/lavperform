import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { BullModule } from '@nestjs/bull';
import { VmLavService } from './api/vmlav.service';
import { VmLavSalesService } from './application/vmlav-sales.service';
import { VmLavSalesProcessor } from './infrastructure/jobs/vmlav-sales.processor';
import { VmLavSaleProcessor } from './infrastructure/jobs/vmlav-sale.processor';
import { VmLavSalesTasks } from './crons/vmlav-sales-tasks';
import { VmLavController } from './presentation/vmlav.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { PartnersModule } from '../../partners/partners.module';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
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
        name: QUEUE_NAMES.VMLAV_SALES_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
      {
        name: QUEUE_NAMES.VMLAV_SALE_PROCESS,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 5000,
          },
        },
      },
    ),

    BullBoardModule.forFeature({
      name: QUEUE_NAMES.VMLAV_SALES_IMPORT,
      adapter: BullAdapter,
    }),

    BullBoardModule.forFeature({
      name: QUEUE_NAMES.VMLAV_SALE_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [VmLavController],
  providers: [
    VmLavService,
    VmLavSalesService,
    ...workerProviders(
      VmLavSalesProcessor,
      VmLavSaleProcessor,
      VmLavSalesTasks,
    ),
  ],
  exports: [VmLavService, VmLavSalesService],
})
export class VmLavModule {}
