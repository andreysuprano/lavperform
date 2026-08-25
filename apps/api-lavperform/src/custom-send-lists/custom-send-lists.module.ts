import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../prisma/prisma.module';
import { CustomersModule } from '../customers/customers.module';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { workerProviders } from '../common/queue/worker-runtime.config';
import { CustomSendListsController } from './presentation/custom-send-lists.controller';
import { CustomSendListsService } from './application/custom-send-lists.service';
import { CustomSendListPrismaRepository } from './infrastructure/persistence/prisma-custom-send-list.repository';
import { CustomSendListImportProcessor } from './infrastructure/jobs/custom-send-list-import.processor';

@Module({
  imports: [
    PrismaModule,
    CustomersModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CUSTOM_SEND_LIST_IMPORT,
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 1000 },
        removeOnComplete: true,
        removeOnFail: 100,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CUSTOM_SEND_LIST_IMPORT,
      adapter: BullAdapter,
    }),
  ],
  controllers: [CustomSendListsController],
  providers: [
    CustomSendListsService,
    ...workerProviders(CustomSendListImportProcessor),
    {
      provide: 'ICustomSendListRepository',
      useClass: CustomSendListPrismaRepository,
    },
  ],
  exports: [CustomSendListsService],
})
export class CustomSendListsModule {}
