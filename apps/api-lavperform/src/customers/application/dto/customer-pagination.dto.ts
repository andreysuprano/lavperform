import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

function toOptionalBoolean({ value }: { value: unknown }): boolean | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  if (value === true || value === 'true' || value === '1') return true;
  if (value === false || value === 'false' || value === '0') return false;
  return undefined;
}

export class CustomerPaginationDto extends PaginationDto {
  @ApiProperty({
    description: 'Filtrar por categoria(s) RFV ou lead (clientes sem pedidos)',
    required: false,
    isArray: true,
    type: [String],
    example: ['campeao', 'fiel', 'lead'],
  })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @Transform(({ value }) => {
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (trimmed.startsWith('[')) {
        try {
          const parsed = JSON.parse(trimmed);
          return Array.isArray(parsed) ? parsed : [value];
        } catch {
          return [value];
        }
      }
      return [value];
    }
    return value;
  })
  rfvClassification?: string[];

  @ApiProperty({
    description: 'Filtrar clientes com ou sem e-mail',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  hasEmail?: boolean;

  @ApiProperty({
    description: 'Filtrar clientes com ou sem data de nascimento',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  hasBirthDate?: boolean;

  @ApiProperty({
    description: 'Filtrar pelo mês da data de nascimento (1-12)',
    required: false,
    minimum: 1,
    maximum: 12,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(12)
  birthMonth?: number;

  @ApiProperty({
    description: 'Filtrar por opt-in de WhatsApp',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  whatsappOptin?: boolean;

  @ApiProperty({
    description: 'Filtrar por WhatsApp verificado',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  whatsappVerified?: boolean;

  @ApiProperty({
    description: 'Filtrar leads (sem pedidos) ou clientes com pedidos',
    required: false,
    type: Boolean,
  })
  @IsOptional()
  @Transform(toOptionalBoolean)
  @IsBoolean()
  hasOrders?: boolean;

  @ApiProperty({
    description: 'Campo para ordenação da listagem de clientes',
    required: false,
    enum: ['createdAt', 'name', 'lastOrderDate', 'averageTicket', 'updatedAt', 'birthDate'],
  })
  @IsOptional()
  @IsString()
  @IsIn(['createdAt', 'name', 'lastOrderDate', 'averageTicket', 'updatedAt', 'birthDate'])
  declare orderBy?: string;
}
