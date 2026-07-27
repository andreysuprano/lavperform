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
    description: 'Data inicial do período (ISO). Sem datas = all-time.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'Data final do período (ISO). Sem datas = all-time.',
    required: false,
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}
