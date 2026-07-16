import { ApiProperty } from '@nestjs/swagger';
export class InstanceDto {
  @ApiProperty({
    description: 'Nome da instância',
    example: 'over-food'
  })
  name: string;
  @ApiProperty({
    description: 'Owner da instância',
    example: ''
  })
  status: string;
  @ApiProperty({
    description: 'QR Code da instância',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
  })
  qrcode: string;
}
export class BaseWebhookDto {
    BaseUrl: string;  @ApiProperty({
    description: 'Base URL do webhook',
    example: 'https://foodcrm.uazapi.com'
  })    
    EventType: string;
    @ApiProperty({
    description: 'Tipo do evento',
    example: 'connection'
  })
  instanceName: string;

  @ApiProperty({
    description: 'Status da instância',
    example: 'connecting'
  })
  instance: InstanceDto;

  @ApiProperty({
    description: 'Owner da instância',
    example: ''
  })
  owner: string;
  @ApiProperty({
    description: 'Token da instância',
    example: '93089cf2-ac6e-4fc9-949c-8791062cb890'
  })
  token: string;
}

