import { ApiProperty } from '@nestjs/swagger';

export class MonthlySalesItemDto {
  @ApiProperty({ example: 'Jan', description: 'Nome abreviado do mês em pt-BR' })
  month: string;

  @ApiProperty({ example: 142, description: 'Quantidade de vendas no mês' })
  count: number;

  @ApiProperty({ example: 8540.5, description: 'Valor acumulado das vendas no mês' })
  totalValue: number;
}

export class TodaySalesDto {
  @ApiProperty({ example: 12, description: 'Quantidade de vendas realizadas hoje' })
  count: number;

  @ApiProperty({ example: 650.0, description: 'Valor total acumulado das vendas de hoje' })
  totalValue: number;
}

export class MonthlySalesHistoryResponseDto {
  @ApiProperty({ type: TodaySalesDto, description: 'Resumo das vendas do dia atual' })
  today: TodaySalesDto;

  @ApiProperty({ type: [MonthlySalesItemDto], description: 'Série mensal dos últimos 6 meses' })
  series: MonthlySalesItemDto[];
}
