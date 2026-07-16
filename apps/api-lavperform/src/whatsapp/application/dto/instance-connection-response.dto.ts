import { ApiProperty } from '@nestjs/swagger';

export class InstanceConnectionResponseDto {
  @ApiProperty({
    description: 'QR Code para conexão do WhatsApp',
    example: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...',
    required: false
  })
  qrcode?: string;

  @ApiProperty({
    description: 'Código de pareamento para conexão',
    example: '123456',
    required: false
  })
  pairingCode?: string;

  @ApiProperty({
    description: 'Código de conexão',
    example: '789012',
    required: false
  })
  code?: string;

  @ApiProperty({
    description: 'Status atual da instância',
    example: 'PENDING',
    enum: ['PENDING', 'CONNECTED', 'DISCONNECTED']
  })
  status: string;

  @ApiProperty({
    description: 'Mensagem informativa sobre o status',
    example: 'Aguardando conexão do WhatsApp',
    required: false
  })
  message?: string;
} 