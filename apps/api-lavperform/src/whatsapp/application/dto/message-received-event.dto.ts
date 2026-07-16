import { ApiProperty } from '@nestjs/swagger';
import { BaseWebhookDto } from './base-webhook.dto';

export class MessageReceivedEventDto extends BaseWebhookDto {
  @ApiProperty({
    description: 'Dados da mensagem',
    example: {
      key: {
        remoteJid: '5511999999999@s.whatsapp.net',
        fromMe: false,
        id: '3EB0C7D15B5A8F22B7'
      },
      message: {
        conversation: 'Olá, tudo bem?'
      },
      messageTimestamp: 1234567890,
      status: 'received'
    }
  })
  data: {
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
  };
} 