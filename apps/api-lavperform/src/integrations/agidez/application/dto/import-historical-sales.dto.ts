import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class AgidezImportHistoricalSalesDto {
  @ApiProperty({
    description: 'Data de início da importação (formato ISO: YYYY-MM-DD)',
    example: '2026-01-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de término da importação (formato ISO: YYYY-MM-DD)',
    example: '2026-09-23',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
