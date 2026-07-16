import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreditLedgerEntryType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class CreditLedgerFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrar por tipo de lançamento',
    enum: CreditLedgerEntryType,
  })
  @IsOptional()
  @IsEnum(CreditLedgerEntryType)
  type?: CreditLedgerEntryType;

  @ApiPropertyOptional({ description: 'Filtrar por produto consumido' })
  @IsOptional()
  @IsString()
  productId?: string;

  @ApiPropertyOptional({ description: 'Data inicial da criação' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final da criação' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
