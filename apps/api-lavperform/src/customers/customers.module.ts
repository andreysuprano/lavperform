import { Module, forwardRef } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { CustomersController } from './presentation/customers.controller';
import { CustomersService } from './application/customers.service';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersProcessor } from './infrastructure/jobs/customers.processor';
import { WhatsappValidationProcessor } from './infrastructure/jobs/whatsapp-validation.processor';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { CustomerPrismaRepository } from './infrastructure/persistence/prisma-customer.repository';
import { OrderPrismaRepository } from 'src/orders/infrastructure/persistence/prisma-order.repository';
import { DigitalMenuIntegrationPrismaRepository } from 'src/partners/infrastructure/persistence/prisma-digital-menu-integration.repository';
import { WhatsappModule } from '../whatsapp/whatsapp.module';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => WhatsappModule),
    BullModule.registerQueue(
      {
        name: QUEUE_NAMES.CUSTOMERS_IMPORT,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
      {
        name: QUEUE_NAMES.WHATSAPP_VALIDATION,
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 2000,
          },
          removeOnComplete: true,
          removeOnFail: false,
        },
      },
    ),
    BullBoardModule.forFeature(
      {
        name: QUEUE_NAMES.CUSTOMERS_IMPORT,
        adapter: BullAdapter,
      },
      {
        name: QUEUE_NAMES.WHATSAPP_VALIDATION,
        adapter: BullAdapter,
      },
    ),
  ],
  controllers: [CustomersController],
  providers: [
    CustomersService,
    ...workerProviders(
      CustomersProcessor,
      WhatsappValidationProcessor,
    ),
    {
      provide: 'ICustomerRepository',
      useClass: CustomerPrismaRepository,
    },
    {
      provide: 'IOrderRepository',
      useClass: OrderPrismaRepository,
    },
    {
      provide: 'IDigitalMenuIntegrationRepository',
      useClass: DigitalMenuIntegrationPrismaRepository,
    },
  ],
  exports: [CustomersService, 'ICustomerRepository'],
})
export class CustomersModule { } 