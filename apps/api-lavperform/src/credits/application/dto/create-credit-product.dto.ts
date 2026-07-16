import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsInt, IsOptional, IsString, Min } from 'class-validator';

export class CreateCreditProductDto {
  @ApiProperty({ description: 'Nome do produto consumível' })
  @IsString()
  name: string;

  @ApiProperty({ description: 'Código único do produto dentro da empresa' })
  @IsString()
  code: string;

  @ApiPropertyOptional({ description: 'Descrição do produto' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    description: 'Valor em créditos/centavos consumido pelo produto',
  })
  @IsInt()
  @Min(1)
  priceCents: number;

  @ApiPropertyOptional({
    description: 'Define se o produto está ativo',
    default: true,
  })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}
