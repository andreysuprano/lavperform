import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiBearerAuth,
  ApiBody,
} from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { WindelSalesService } from '../application/windel-sales.service';
import { WindelImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Windel Integration')
@Controller('companies/:companyId/windel')
export class WindelController {
  constructor(private readonly windelSalesService: WindelSalesService) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas da Windel',
    description:
      'Importa o cadastro de clientes da Windel e as ordens de serviço atendidas do período (padrão: últimos 90 dias).',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: WindelImportHistoricalSalesDto })
  @ApiResponse({
    status: 200,
    description: 'Importação histórica iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação histórica Windel iniciada com sucesso',
        totalDays: 90,
        startDate: '2024-12-08',
        endDate: '2025-03-08',
        jobsCreated: 90,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada ou integração Windel não configurada',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: WindelImportHistoricalSalesDto,
  ) {
    return this.windelSalesService.importHistoricalSales(companyId, importDto);
  }
}
