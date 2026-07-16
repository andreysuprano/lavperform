import { ApiProperty } from '@nestjs/swagger';
import {
    IsBoolean,
    IsDateString,
    IsNotEmpty,
    IsNumber,
    IsOptional,
    IsPositive,
    IsString,
} from 'class-validator';

export class CreateCouponDto {
    @ApiProperty({
        description: 'Código do cupom gerado na plataforma externa',
        example: 'PROMO20',
    })
    @IsString()
    @IsNotEmpty()
    code: string;

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
    })
    @IsString()
    @IsNotEmpty()
    type: string;

    @ApiProperty({
        description: 'Unidade do cupom (porcentagem, reais, etc.)',
        example: 'porcentagem',
    })
    @IsString()
    @IsNotEmpty()
    unit: string;

    @ApiProperty({
        description: 'Valor do cupom',
        example: 20.0,
    })
    @IsNumber({ maxDecimalPlaces: 2 })
    @IsPositive()
    value: number;

    @ApiProperty({
        description: 'Data de validade do cupom (ISO 8601)',
        example: '2026-12-31T23:59:59Z',
    })
    @IsDateString()
    @IsNotEmpty()
    validUntil: string;

    @ApiProperty({
        description: 'Se o cupom está ativo',
        example: true,
        required: false,
        default: true,
    })
    @IsBoolean()
    @IsOptional()
    active?: boolean;
}
