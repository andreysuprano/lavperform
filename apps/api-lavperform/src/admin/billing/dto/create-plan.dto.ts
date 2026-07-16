import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CycleType } from '@prisma/client';
import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

export class CreatePlanDto {
  @ApiProperty({ description: 'Nome do plano' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Descrição exibida nas cobranças' })
  @IsString()
  description: string;

  @ApiProperty({ description: 'Preço em reais (0 para plano gratuito)', default: 0 })
  @IsNumber()
  @Min(0)
  price: number;

  @ApiPropertyOptional({
    description: 'Ciclo de cobrança',
    enum: CycleType,
    default: CycleType.MONTHLY,
  })
  @IsOptional()
  @IsEnum(CycleType)
  cycle?: CycleType;

  @ApiPropertyOptional({ description: 'Destacar como recomendado', default: false })
  @IsOptional()
  @IsBoolean()
  recommended?: boolean;

  @ApiPropertyOptional({
    description: 'Número máximo de cobranças (0 = ilimitado no Asaas)',
    default: 1,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  maxPayments?: number;

  @ApiPropertyOptional({ description: 'Data de encerramento do plano' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ description: 'Plano disponível para novas assinaturas', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({
    description: 'Plano usado no fluxo público de self checkout (/signup)',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  isSelfCheckout?: boolean;

  @ApiPropertyOptional({
    description: 'Permite pagamento por boleto como alternativa ao cartão',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowBoleto?: boolean;

  @ApiPropertyOptional({
    description: 'Permite pagamento por Pix como alternativa ao cartão',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  allowPix?: boolean;
}
