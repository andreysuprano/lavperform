import { Module } from '@nestjs/common';
import { MessageBufferService } from '../../application/webhook/services/message-buffer.service';
import { BullSetupModule } from './bull.setup.module';

/**
 * Módulo compartilhado que expõe o MessageBufferService.
 * Importado pelo WebhookModule (recepção) e pelo QueueModule (processamento)
 * para garantir uma única instância do serviço e da conexão Redis do buffer.
 */
@Module({
  imports: [BullSetupModule],
  providers: [MessageBufferService],
  exports: [MessageBufferService],
})
export class MessageBufferModule {}
