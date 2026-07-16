import { ApiProperty } from '@nestjs/swagger';
import { BaseWebhookDto } from './base-webhook.dto';

export class ConnectionUpdateEventDto extends BaseWebhookDto {
  @ApiProperty({
    description: 'Dados do evento',
    example: {
      instance: 'Andrey',
      state: 'close',
      statusReason: 401
    }
  })
  data: {
    instance: string;
    state: string;
    statusReason: number;
  };
} 
