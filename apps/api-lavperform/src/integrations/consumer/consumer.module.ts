import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullAdapter } from '@bull-board/api/bullAdapter';
import { PrismaModule } from '../../prisma/prisma.module';
import { PartnersModule } from '../../partners/partners.module';
import { CompaniesModule } from '../../companies/companies.module';
import { CustomersModule } from '../../customers/customers.module';
import { OrderModule } from '../../orders/order.module';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';
import { ConsumerController } from './presentation/consumer.controller';
import { ConsumerWebhookService } from './application/consumer-webhook.service';
import { ConsumerWebhookReceivedRepository } from './infrastructure/persistence/consumer-webhook-received.repository';
import { ConsumerWebhookProcessor } from './infrastructure/jobs/consumer-webhook.processor';
import { workerProviders } from '../../common/queue/worker-runtime.config';

@Module({
  imports: [
    PrismaModule,
    PartnersModule,
    CompaniesModule,
    CustomersModule,
    OrderModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.CONSUMER_WEBHOOK_PROCESS,
      defaultJobOptions: {
        attempts: 5,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
    BullBoardModule.forFeature({
      name: QUEUE_NAMES.CONSUMER_WEBHOOK_PROCESS,
      adapter: BullAdapter,
    }),
  ],
  controllers: [ConsumerController],
  providers: [
    ConsumerWebhookService,
    ...workerProviders(ConsumerWebhookProcessor),
    {
      provide: 'IWebhookReceivedRepository',
      useClass: ConsumerWebhookReceivedRepository,
    },
  ],
  exports: [ConsumerWebhookService],
})
export class ConsumerModule {}
