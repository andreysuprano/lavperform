import { ApiProperty } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsBoolean, IsDateString, IsOptional, IsString } from 'class-validator';

export class CouponFilterDto {
    @ApiProperty({
        description: 'Busca parcial por código ou descrição do cupom',
        required: false,
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiProperty({
        description: 'Filtrar por tipo do cupom',
        required: false,
    })
    @IsOptional()
    @IsString()
    type?: string;

    @ApiProperty({
        description: 'Filtrar por unidade do cupom',
        required: false,
    })
    @IsOptional()
    @IsString()
    unit?: string;

    @ApiProperty({
        description: 'Filtrar apenas cupons ativos',
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).toLowerCase().trim();
        if (['true', '1'].includes(normalized)) return true;
        if (['false', '0'].includes(normalized)) return false;
        return value;
    })
    @IsBoolean()
    active?: boolean;

    @ApiProperty({
        description: 'Filtrar cupons cuja validade é maior ou igual a esta data',
        example: '2026-01-01T00:00:00Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    validFrom?: string;

    @ApiProperty({
        description: 'Filtrar cupons cuja validade é menor ou igual a esta data',
        example: '2026-12-31T23:59:59Z',
        required: false,
    })
    @IsOptional()
    @IsDateString()
    validTo?: string;

    @ApiProperty({
        description: 'Considerar apenas cupons ainda vigentes (validUntil >= agora)',
        required: false,
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (value === undefined || value === null || value === '') return undefined;
        if (typeof value === 'boolean') return value;
        const normalized = String(value).toLowerCase().trim();
        if (['true', '1'].includes(normalized)) return true;
        if (['false', '0'].includes(normalized)) return false;
        return value;
    })
    @IsBoolean()
    onlyValid?: boolean;

    @ApiProperty({
        description: 'Incluir cupons excluídos (soft delete)',
        required: false,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    includeDeleted?: boolean;
}
