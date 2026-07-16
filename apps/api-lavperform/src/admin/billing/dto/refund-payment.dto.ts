import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class RefundPaymentDto {
  @ApiPropertyOptional({ description: 'Valor a estornar (total se omitido)' })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  value?: number;

  @ApiPropertyOptional({ description: 'Motivo do estorno' })
  @IsOptional()
  @IsString()
  description?: string;
}
