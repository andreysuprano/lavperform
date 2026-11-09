import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsOptional } from 'class-validator';

export class WaymoneyImportHistoricalSalesDto {
  @ApiProperty({
    description: 'Data de início da importação (formato ISO: YYYY-MM-DD)',
    example: '2026-08-01',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de término da importação (formato ISO: YYYY-MM-DD)',
    example: '2026-11-09',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
