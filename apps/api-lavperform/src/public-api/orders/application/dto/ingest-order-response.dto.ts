import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class IngestOrderQueuedResponseDto {
  @ApiProperty({ example: 'queued', enum: ['queued'] })
  status: 'queued';

  @ApiProperty({ example: 'company-uuid:os-ext-12345' })
  jobId: string;

  @ApiProperty({ example: 'os-ext-12345' })
  externalOrderId: string;
}

export class IngestOrderAlreadyReceivedResponseDto {
  @ApiProperty({ example: 'already_received', enum: ['already_received'] })
  status: 'already_received';

  @ApiProperty({ example: 'os-ext-12345' })
  externalOrderId: string;

  @ApiPropertyOptional({ example: 'uuid-da-os' })
  orderId?: string;
}

export class IngestOrderErrorResponseDto {
  @ApiProperty({ example: 400 })
  statusCode: number;

  @ApiProperty({ example: ['Campo inválido'] })
  message: string | string[];

  @ApiProperty({ example: 'Bad Request' })
  error: string;
}
