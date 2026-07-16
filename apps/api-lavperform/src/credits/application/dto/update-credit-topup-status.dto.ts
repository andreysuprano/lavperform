import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CreditTopupStatus } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional } from 'class-validator';

export class UpdateCreditTopupStatusDto {
  @ApiProperty({
    description: 'Novo status da recarga',
    enum: CreditTopupStatus,
  })
  @IsEnum(CreditTopupStatus)
  status: CreditTopupStatus;

  @ApiPropertyOptional({
    description: 'Data de pagamento quando status for PAID',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;
}
