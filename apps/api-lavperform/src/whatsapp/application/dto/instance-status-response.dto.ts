import { ApiProperty } from '@nestjs/swagger';

export class InstanceStatusResponseDto {
  @ApiProperty({
    description: 'Status atual da instância',
    example: 'CONNECTED',
    enum: ['PENDING', 'CONNECTED', 'DISCONNECTED', 'UNKNOWN']
  })
  status: string;

  @ApiProperty({
    description: 'Mensagem informativa sobre o status',
    example: 'Instância conectada com sucesso',
    required: false
  })
  message?: string;

  @ApiProperty({
    description:
      'Número do WhatsApp conectado (somente dígitos). Mantém o último número conhecido quando a instância está desconectada.',
    example: '5511999990000',
    nullable: true
  })
  phoneNumber: string | null;
} 