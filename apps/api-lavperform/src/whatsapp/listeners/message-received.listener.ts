import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';

interface MessageReceivedEvent {
  key: {
    remoteJid: string;
    fromMe: boolean;
    id: string;
  };
  message: {
    conversation: string;
  };
  messageTimestamp: number;
  status: string;
}

@Injectable()
export class MessageReceivedListener {
  private readonly logger = new Logger(MessageReceivedListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent('whatsapp.message.received')
  async handleMessageReceived(data: MessageReceivedEvent) {
    this.logger.log(`Recebida nova mensagem do número ${data.key.remoteJid}`);
    this.logger.debug(`Detalhes da mensagem: ${JSON.stringify(data)}`);

    // Aqui você pode adicionar a lógica para processar a mensagem
    // Por exemplo, salvar no banco de dados, enviar para um serviço de processamento, etc.

    this.logger.log(`Mensagem processada com sucesso`);
  }
} 