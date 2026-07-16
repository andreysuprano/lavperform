import { ApiProperty } from '@nestjs/swagger';
import { IsDateString, IsNotEmpty } from 'class-validator';
import { Type } from 'class-transformer';

export class ReprocessAttributionDto {
  @ApiProperty({
    description: 'Data de início do intervalo (ISO 8601)',
    example: '2025-01-01T00:00:00.000Z',
  })
  @IsDateString()
  @IsNotEmpty()
  startDate: string;

  @ApiProperty({
    description: 'Data de fim do intervalo (ISO 8601)',
    example: '2025-01-31T23:59:59.999Z',
  })
  @IsDateString()
  @IsNotEmpty()
  endDate: string;
}
