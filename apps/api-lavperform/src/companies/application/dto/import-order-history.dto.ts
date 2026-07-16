import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional, Validate } from 'class-validator';
import { ImportOrderHistoryDateRangeValidator } from './import-order-history-date-range.validator';

export class ImportOrderHistoryDto {
  @ApiProperty({
    description:
      'Data de início da importação (formato: YYYY-MM-DD). Padrão: 90 dias atrás. Sem limite máximo quando informada.',
    example: '2024-12-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de término da importação (formato: YYYY-MM-DD). Padrão: hoje.',
    example: '2025-03-23',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  @Validate(ImportOrderHistoryDateRangeValidator)
  endDate?: string;
}
