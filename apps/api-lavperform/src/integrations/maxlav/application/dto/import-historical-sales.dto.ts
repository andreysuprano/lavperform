import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class MaxlavImportHistoricalSalesDto {
  @ApiProperty({
    description: 'Data de início da importação (formato ISO: YYYY-MM-DD)',
    example: '2025-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de término da importação (formato ISO: YYYY-MM-DD)',
    example: '2025-04-29',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
