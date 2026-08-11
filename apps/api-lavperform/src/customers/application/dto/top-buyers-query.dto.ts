import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

export class TopBuyersQueryDto {
  @ApiProperty({
    description: 'Quantidade máxima de clientes no ranking',
    required: false,
    default: 10,
  })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  @Max(50)
  limit?: number = 10;

  @ApiProperty({
    description: 'Critério de ordenação do ranking',
    required: false,
    enum: ['totalSpent', 'orderCount'],
    default: 'totalSpent',
  })
  @IsOptional()
  @IsIn(['totalSpent', 'orderCount'])
  sortBy?: 'totalSpent' | 'orderCount' = 'totalSpent';

  @ApiProperty({
    description:
      'Data inicial do período (YYYY-MM-DD ou ISO 8601). Deve ser enviada junto com endDate. ' +
      'Filtra Order.createdAt a partir do início do dia (America/Sao_Paulo). ' +
      'Sem startDate e endDate = histórico (all-time).',
    required: false,
    example: '2026-08-01',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description:
      'Data final do período (YYYY-MM-DD ou ISO 8601). Deve ser enviada junto com startDate. ' +
      'Filtra Order.createdAt até o fim do dia (America/Sao_Paulo). ' +
      'Sem startDate e endDate = histórico (all-time).',
    required: false,
    example: '2026-08-31',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
