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
} 