import { Module } from '@nestjs/common';
import { WhatsappModule } from '../../whatsapp/whatsapp.module';
import { AdminWhatsappController } from './admin-whatsapp.controller';
import { AdminWhatsappConnectionLinkService } from './admin-whatsapp-connection-link.service';
import { AdminWhatsappService } from './admin-whatsapp.service';
import { PublicWhatsappConnectController } from './public-whatsapp-connect.controller';

@Module({
  imports: [WhatsappModule],
  controllers: [AdminWhatsappController, PublicWhatsappConnectController],
  providers: [AdminWhatsappService, AdminWhatsappConnectionLinkService],
})
export class AdminWhatsappModule {}
