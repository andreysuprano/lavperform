import { Module } from '@nestjs/common';
import { WebhooksController } from './presentation/webhooks.controller';
import { WebhooksService } from './application/webhooks.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { Logger } from '@nestjs/common';
import { WebhookReceivedPrismaRepository } from './infrastructure/persistence/prisma-webhook-received.repository';

@Module({
  imports: [PrismaModule],
  controllers: [WebhooksController],
  providers: [
    WebhooksService,
    Logger,
    {
      provide: 'IWebhookReceivedRepository',
      useClass: WebhookReceivedPrismaRepository,
    },
  ],
  exports: [WebhooksService, 'IWebhookReceivedRepository'],
})
export class WebhooksModule {}
