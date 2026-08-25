import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiQuery, ApiBearerAuth } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { OrderService } from '../application/order.service';
import { OrderFilterDto } from '../application/dto/order-filter.dto';
import { SalesSummaryResponseDto } from '../application/dto/sales-summary.dto';
import { MonthlySalesHistoryResponseDto } from '../application/dto/monthly-sales-history.dto';

@ApiTags('Orders')
@Controller('companies/:companyId/orders')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class OrderController {
  constructor(private readonly orderService: OrderService) { }

  @Get()
  @ApiOperation({ summary: 'Listar todos os pedidos de uma empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'status', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  findAll(@Param('companyId') companyId: string, @Query() filterDto: OrderFilterDto) {
    return this.orderService.findByCompanyId(companyId, filterDto);
  }

  @Get('monthly-sales')
  @ApiOperation({ summary: 'Histórico mensal de vendas dos últimos 6 meses para gráfico' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  getMonthlySales(
    @Param('companyId') companyId: string,
  ): Promise<MonthlySalesHistoryResponseDto> {
    return this.orderService.findMonthlySalesHistory(companyId);
  }

  @Get('sales')
  @ApiOperation({ summary: 'Listar vendas da empresa com data, valor, produtos e cliente' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Itens por página' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial (ISO 8601)' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final (ISO 8601)' })
  @ApiQuery({ name: 'period', required: false, enum: ['today'], description: 'Dia civil (mesmo recorte de getTodaySales). Ignora startDate/endDate.' })
  findSales(
    @Param('companyId') companyId: string,
    @Query() filterDto: OrderFilterDto,
  ): Promise<SalesSummaryResponseDto> {
    return this.orderService.findSalesSummary(companyId, filterDto);
  }

  @Get('customer/:customerId')
  @ApiOperation({ summary: 'Buscar pedidos por ID do cliente' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'customerId', description: 'ID do cliente' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findByCustomer(
    @Param('customerId') customerId: string,
    @Query() filterDto: OrderFilterDto,
  ) {
    return this.orderService.findByCustomerId(customerId, filterDto);
  }
}
