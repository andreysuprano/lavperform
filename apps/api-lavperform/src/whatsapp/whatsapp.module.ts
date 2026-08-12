import { Module, forwardRef } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WhatsappService } from './application/whatsapp.service';
import { WhatsappController } from './presentation/whatsapp.controller';
import { WhatsappWebhookController } from './presentation/webhook.controller';
import { EvolutionClient } from './clients/evolution.client';
import { ConnectionUpdateListener } from './listeners/connection-update.listener';
import { MessageReceivedListener } from './listeners/message-received.listener';
import { WhatsappInstancePrismaRepository } from './infrastructure/persistence/prisma-whatsapp-instance.repository';
import { PrismaModule } from '../prisma/prisma.module';
import { CompaniesModule } from '../companies/companies.module';
import { AiAgentModule } from '../ai-agent/ai-agent.module';
import { UazapiClient } from './uazapi/uazapi.client';
import { WhatsappInstanceCleanupTasks } from './crons/whatsapp-instance-cleanup-tasks';
import { WhatsappAgentWebhookSyncTasks } from './crons/whatsapp-agent-webhook-sync.tasks';
import { workerProviders } from '../common/queue/worker-runtime.config';

@Module({
  imports: [
    HttpModule,
    PrismaModule,
    forwardRef(() => CompaniesModule),
    forwardRef(() => AiAgentModule),
  ],
  controllers: [
    WhatsappController,
    WhatsappWebhookController,
  ],
  providers: [
    WhatsappService,
    EvolutionClient,
    UazapiClient,
    ...workerProviders(
      ConnectionUpdateListener,
      MessageReceivedListener,
      WhatsappInstanceCleanupTasks,
      WhatsappAgentWebhookSyncTasks,
    ),
    {
      provide: 'IWhatsappInstanceRepository',
      useClass: WhatsappInstancePrismaRepository,
    },
  ],
  exports: [WhatsappService, EvolutionClient, UazapiClient, 'IWhatsappInstanceRepository'],
})
export class WhatsappModule {}
