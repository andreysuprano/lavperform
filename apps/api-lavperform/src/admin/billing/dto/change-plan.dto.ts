import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsNumber, IsOptional, IsString, IsUUID, Min } from 'class-validator';

export class ChangePlanDto {
  @ApiProperty({ description: 'ID do plano de destino' })
  @IsUUID()
  planId: string;

  @ApiPropertyOptional({ description: 'Valor customizado (sobrescreve o preço do plano)' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  value?: number;

  @ApiPropertyOptional({ description: 'Ciclo de cobrança (MONTHLY, YEARLY, etc.)' })
  @IsOptional()
  @IsString()
  cycle?: string;

  @ApiPropertyOptional({ description: 'Forma de pagamento no Asaas (BOLETO, PIX, CREDIT_CARD, UNDEFINED)' })
  @IsOptional()
  @IsString()
  billingType?: string;

  @ApiPropertyOptional({
    description: 'Atualizar cobranças pendentes com novo valor/forma',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  updatePendingPayments?: boolean;
}
