import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString } from 'class-validator';

export class ImportHistoricalSalesDto {
  @ApiProperty({
    description: 'Data de início da importação (formato ISO: YYYY-MM-DD)',
    example: '2024-12-08',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  startDate?: string;

  @ApiProperty({
    description: 'Data de término da importação (formato ISO: YYYY-MM-DD)',
    example: '2025-03-08',
    required: false,
  })
  @IsDateString()
  @IsOptional()
  endDate?: string;
}
