import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString } from 'class-validator';
import { Transform } from 'class-transformer';
import { PaginationDto } from '../../../common/dto/pagination.dto';

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
}
