import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../../prisma/prisma.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { OrderIngestionService } from './application/order-ingestion.service';

const queueRegistration = BullModule.registerQueue({
  name: QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 3000 },
    removeOnComplete: true,
    removeOnFail: false,
  },
});

/**
 * Enfileiramento de pedidos (Public API e webhooks de integração).
 * O processamento assíncrono fica em {@link PublicApiOrderWorkerModule}.
 */
@Module({
  imports: [
    PrismaModule,
    queueRegistration,
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.PUBLIC_API_ORDER_INGESTION,
      adapter: BullAdapter,
    }),
  ],
  providers: [OrderIngestionService],
  exports: [OrderIngestionService, queueRegistration],
})
export class PublicApiOrderIngestionModule {}
