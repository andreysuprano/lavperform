import { Module } from '@nestjs/common';
import { WhatsappModule } from '../../whatsapp/whatsapp.module';
import { WhatsappConnectionReconcileTasks } from '../../whatsapp/crons/whatsapp-connection-reconcile-tasks';
import { AdminWhatsappController } from './admin-whatsapp.controller';
import { AdminWhatsappConnectionLinkService } from './admin-whatsapp-connection-link.service';
import { AdminWhatsappService } from './admin-whatsapp.service';
import { PublicWhatsappConnectController } from './public-whatsapp-connect.controller';

@Module({
  imports: [WhatsappModule],
  controllers: [AdminWhatsappController, PublicWhatsappConnectController],
  providers: [
    AdminWhatsappService,
    AdminWhatsappConnectionLinkService,
    // O cron só vive na API principal (`workerProviders`). O admin registra a
    // mesma classe para disparo manual; sem ScheduleModule o @Cron não dispara.
    WhatsappConnectionReconcileTasks,
  ],
})
export class AdminWhatsappModule {}
