import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { workerProviders } from '../../common/queue/worker-runtime.config';
import { OrderIngestionProcessor } from './infrastructure/jobs/order-ingestion.processor';

/**
 * Módulo consumido pela API principal para processar jobs enfileirados pela Public API.
 */
@Module({
  imports: [
    OrderModule,
    CustomersModule,
    EventEmitterModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION,
      adapter: BullAdapter,
    }),
  ],
  providers: [...workerProviders(OrderIngestionProcessor)],
})
export class PublicApiOrderWorkerModule {}
