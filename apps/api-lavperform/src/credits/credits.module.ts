import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { PrismaModule } from '../prisma/prisma.module';
import { AsaasModule } from '../integrations/asaas/asaas.module';
import { QUEUE_NAMES } from '../common/queue/queue.constants';
import { CreditsService } from './application/credits.service';
import { CreditsController } from './presentation/credits.controller';
import { DefaultCreditProductsController } from './presentation/default-credit-products.controller';
import { AsaasWebhookController } from './presentation/asaas-webhook.controller';
import { CreditsConsumeListener } from './listeners/credits-consume.listener';
import { AsaasPaymentProcessor } from './infrastructure/jobs/asaas-payment.processor';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    PrismaModule,
    AsaasModule,
    BullModule.registerQueue({
      name: QUEUE_NAMES.ASAAS_PAYMENT_PROCESS,
      defaultJobOptions: {
        removeOnComplete: true,
        removeOnFail: false,
      },
    }),
  ],
  controllers: [
    CreditsController,
    DefaultCreditProductsController,
    AsaasWebhookController,
  ],
  providers: [
    CreditsService,
    ...workerProviders(
      CreditsConsumeListener,
      AsaasPaymentProcessor,
    ),
  ],
  exports: [CreditsService],
})
export class CreditsModule {}
