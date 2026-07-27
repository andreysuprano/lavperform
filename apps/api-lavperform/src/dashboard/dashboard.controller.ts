import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DashboardService } from './dashboard.service';
import { DateFilter } from 'src/common/utils/dateFilter';
import { DateRangeFilterDto } from '../common/dto/date-range-filter.dto';

@ApiTags('Dashboard')
@Controller('dashboard')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('customers-summary/:companyId')
  @ApiOperation({ summary: 'Obter dados do dashboard' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  getCustomersSummary(@Param('companyId') companyId: string) {
    return this.dashboardService.getCustomersSummary(companyId);
  }

  @Get('customers-insights/:companyId')
  @ApiOperation({
    summary: 'Obter inteligência de CRM da base de clientes',
    description:
      'Retorna resumo, segmentos RFV, oportunidades (retenção, reconquista, fidelização), ' +
      'saúde da base e padrões (ticket médio, melhores dias, aniversariantes).',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  getCustomersInsights(@Param('companyId') companyId: string) {
    return this.dashboardService.getCustomersInsights(companyId);
  }

  @Get('campaigns-summary/:companyId')
  @ApiOperation({ summary: 'Obter dados do dashboard de campanhas' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiQuery({
    name: 'dateFilter',
    required: false,
    enum: DateFilter,
    description:
      'Filtro pré-definido em dias (7, 14 ou 30). Usado quando startDate/endDate não são enviados.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial (inclusiva) ISO 8601. Deve ser enviada com endDate.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final (inclusiva) ISO 8601. Deve ser enviada com startDate.',
  })
  getCampaignsSummary(
    @Param('companyId') companyId: string,
    @Query() filter: DateRangeFilterDto,
  ) {
    return this.dashboardService.getCampaignsSummary(companyId, filter);
  }
}
