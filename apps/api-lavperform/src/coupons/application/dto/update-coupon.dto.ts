import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
} from 'class-validator';

export class UpdateCouponDto {
    @ApiProperty({
        description: 'Código do cupom gerado na plataforma externa',
        example: 'PROMO20',
        required: false,
    })
    @IsString()
    @IsOptional()
    code?: string;

    @ApiProperty({
        description: 'Descrição do cupom',
        example: '20% de desconto em pedidos acima de R$ 50,00',
        required: false,
        nullable: true,
    })
    @IsString()
    @IsOptional()
    description?: string | null;

    @ApiProperty({
        description: 'Tipo do cupom (segue a mesma lógica do brinde: desconto, brinde, cashback, etc.)',
        example: 'desconto',
        required: false,
    })
    @IsString()
    @IsOptional()
    type?: string;

    @ApiProperty({
        description: 'Unidade do cupom (porcentagem, reais, etc.)',
        example: 'porcentagem',
        required: false,
    })
    @IsString()
    @IsOptional()
    unit?: string;

    @ApiProperty({
        description: 'Valor do cupom',
        example: 20.0,
        required: false,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    @IsOptional()
    value?: number;

    @ApiProperty({
        description: 'Data de validade do cupom (ISO 8601)',
        example: '2026-12-31T23:59:59Z',
        required: false,
    })
    @IsDateString()
    @IsOptional()
    validUntil?: string;

    @ApiProperty({
        description: 'Se o cupom está ativo',
        example: true,
        required: false,
    })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
