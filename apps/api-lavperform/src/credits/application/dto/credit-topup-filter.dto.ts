import { ApiPropertyOptional } from '@nestjs/swagger';
import { CreditPaymentMethod, CreditTopupStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class CreditTopupFilterDto {
  @ApiPropertyOptional({
    description: 'Filtrar por status',
    enum: CreditTopupStatus,
  })
  @IsOptional()
  @IsEnum(CreditTopupStatus)
  status?: CreditTopupStatus;

  @ApiPropertyOptional({
    description: 'Filtrar por método de pagamento',
    enum: CreditPaymentMethod,
  })
  @IsOptional()
  @IsEnum(CreditPaymentMethod)
  paymentMethod?: CreditPaymentMethod;

  @ApiPropertyOptional({ description: 'Data inicial da criação' })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiPropertyOptional({ description: 'Data final da criação' })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
