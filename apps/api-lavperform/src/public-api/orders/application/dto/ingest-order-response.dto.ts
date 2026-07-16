import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestOrderQueuedResponseDto {
  @ApiProperty({ example: 'queued', enum: ['queued'] })
  status: 'queued';

  @ApiProperty({ example: 'company-uuid:order-ext-123' })
  jobId: string;

  @ApiProperty({ example: 'order-ext-123' })
  externalOrderId: string;
}

export class IngestOrderAlreadyReceivedResponseDto {
  @ApiProperty({ example: 'already_received', enum: ['already_received'] })
  status: 'already_received';

  @ApiProperty({ example: 'order-ext-123' })
  externalOrderId: string;

  @ApiPropertyOptional({ example: 'uuid-do-pedido' })
  orderId?: string;
}

export class IngestOrderErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: ['Informe pelo menos um entre phone ou cpf do cliente'] })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
