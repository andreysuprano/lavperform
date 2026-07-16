import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsNumber, IsString, IsDateString, Min, Max, IsIn, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CompanyStatus } from '@prisma/client';

export class PaginationDto {
  @ApiProperty({
    description: 'Número da página',
    required: false,
    default: 1,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiProperty({
    description: 'Quantidade de itens por página',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(100)
  limit?: number = 100;

  @ApiProperty({
    description: 'Campo para ordenação',
    required: false,
  })
  @IsOptional()
  @IsString()
  orderBy?: string = 'createdAt';

  @ApiProperty({
    description: 'Direção da ordenação',
    required: false,
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  @IsOptional()
  @IsIn(['asc', 'desc'])
  orderDirection?: 'asc' | 'desc' = 'desc';

  @ApiProperty({
    description: 'Filtrar por ID',
    required: false,
  })
  @IsOptional()
  @Type(() => String)
  @IsString()
  id?: string;

  @ApiProperty({
    description: 'Data inicial para filtro',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Data final para filtro',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiProperty({
    description: 'Filtrar por nome (busca parcial)',
    required: false,
  })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiProperty({
    description: 'Filtrar por status da empresa',
    required: false,
    enum: CompanyStatus,
  })
  @IsOptional()
  @IsEnum(CompanyStatus)
  state?: CompanyStatus;
} 