import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class CreateBillingPaymentDto {
  @ApiProperty({ description: 'Forma de pagamento (BOLETO, PIX, CREDIT_CARD, UNDEFINED)' })
  @IsString()
  billingType: string;

  @ApiProperty({ description: 'Valor da cobrança em reais' })
  @IsNumber()
  @Min(0.01)
  value: number;

  @ApiProperty({ description: 'Data de vencimento (YYYY-MM-DD)' })
  @IsString()
  dueDate: string;

  @ApiPropertyOptional({ description: 'Descrição da cobrança' })
  @IsOptional()
  @IsString()
  description?: string;
}
