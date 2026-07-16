import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';

export class CreateCreditGrantDto {
  @ApiProperty({ description: 'Valor do crédito concedido em centavos' })
  @IsInt()
  @Min(1)
  amountCents: number;

  @ApiPropertyOptional({
    description: 'Motivo ou observação sobre a concessão',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  reason?: string;
}

export type CreditGrantAdminContext = {
  adminUserId: string;
  adminUserName: string;
};
