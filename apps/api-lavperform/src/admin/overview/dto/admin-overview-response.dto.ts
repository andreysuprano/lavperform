import { ApiProperty } from '@nestjs/swagger';

export class AdminOverviewResponseDto {
  @ApiProperty({ example: 42 })
  companiesCount: number;

  @ApiProperty({ example: 18 })
  activeCampaignsCount: number;

  @ApiProperty({ example: 125000 })
  customersCount: number;

  @ApiProperty({
    description: 'MRR estimado em centavos (planos ativos normalizados para mensal)',
    example: 990000,
  })
  mrrCents: number;

  @ApiProperty({
    description: 'Soma de recargas pagas em centavos',
    example: 4500000,
  })
  topupsPaidCents: number;

  @ApiProperty({
    description: 'Receita incentivada total em reais',
    example: 125000.5,
  })
  incentivizedRevenue: number;

  @ApiProperty({ example: 3200 })
  incentivizedOrdersCount: number;

  @ApiProperty({ example: '2026-05-22T12:00:00.000Z' })
  computedAt: string;

  @ApiProperty({ example: true })
  fromCache: boolean;
}
