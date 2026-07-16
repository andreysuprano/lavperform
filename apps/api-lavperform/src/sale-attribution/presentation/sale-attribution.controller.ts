import { Controller, Post, Get, Param, Body, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiTags } from '@nestjs/swagger';
import { SaleAttributionService } from '../application/sale-attribution.service';
import { ReprocessAttributionDto } from '../application/dto/reprocess-attribution.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Sale Attribution')
@Controller('sale-attribution')
export class SaleAttributionController {
  constructor(private readonly saleAttributionService: SaleAttributionService) {}

  @Get('incentivized-sales/:companyId')
  @ApiOperation({
    summary: 'Total de vendas incentivadas pela plataforma',
    description:
      'Retorna o valor total e a quantidade de pedidos atribuídos a campanhas (com MessageOrder), considerando todo o histórico da empresa. Cada pedido é contado uma vez por campanha atribuída, para bater com a soma dos relatórios individuais.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  async getIncentivizedSales(
    @Param('companyId') companyId: string,
  ) {
    return this.saleAttributionService.getIncentivizedSalesTotal(companyId);
  }

  @Post('reprocess/:companyId')
  @ApiOperation({
    summary: 'Reprocessar atribuição de vendas a campanhas por range de datas',
    description:
      'Enfileira todos os pedidos da empresa no intervalo de datas informado para reatribuição às campanhas. Útil para corrigir métricas de campanhas que não foram processadas.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  async reprocess(
    @Param('companyId') companyId: string,
    @Body() dto: ReprocessAttributionDto,
  ) {
    const result = await this.saleAttributionService.reprocessByDateRange(
      companyId,
      new Date(dto.startDate),
      new Date(dto.endDate),
    );

    return {
      message: `${result.enqueued} pedido(s) enfileirado(s) para reprocessamento de atribuição`,
      companyId,
      startDate: dto.startDate,
      endDate: dto.endDate,
      enqueued: result.enqueued,
    };
  }
}
