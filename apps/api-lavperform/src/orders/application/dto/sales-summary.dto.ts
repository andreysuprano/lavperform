import { ApiProperty } from '@nestjs/swagger';

export class SaleProductDto {
  @ApiProperty({ example: 'X-Burguer', description: 'Nome do produto' })
  name: string;

  @ApiProperty({ example: 2, description: 'Quantidade' })
  quantity: number;
}

export class SalesSummaryItemDto {
  @ApiProperty({ description: 'ID do pedido' })
  orderId: string;

  @ApiProperty({ description: 'Data da venda' })
  date: Date;

  @ApiProperty({ example: 59.9, description: 'Valor total da venda' })
  total: number;

  @ApiProperty({ type: [SaleProductDto], description: 'Produtos comprados' })
  products: SaleProductDto[];

  @ApiProperty({ example: 'João Silva', description: 'Nome do cliente' })
  customerName: string;

  @ApiProperty({ example: '41999999999', nullable: true, required: false })
  customerPhone: string | null;

  @ApiProperty({ example: 'maria@ex.com', nullable: true, required: false })
  customerEmail: string | null;
}

export class SalesSummaryResponseDto {
  @ApiProperty({ type: [SalesSummaryItemDto] })
  sales: SalesSummaryItemDto[];

  @ApiProperty({ example: 100 })
  total: number;

  @ApiProperty({ example: 1 })
  page: number;

  @ApiProperty({ example: 10 })
  limit: number;

  @ApiProperty({ example: 10 })
  totalPages: number;
}
