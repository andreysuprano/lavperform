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
import { MaxlavSalesService } from '../application/maxlav-sales.service';
import { MaxlavImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Maxlav Integration')
@Controller('companies/:companyId/maxlav')
export class MaxlavController {
  constructor(private readonly maxlavSalesService: MaxlavSalesService) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas do Maxlav (maxpan.com.br)',
    description:
      'Importa vendas retroativas (padrão: últimos 90 dias) enfileirando um job por dia. ' +
      'Cada job busca todos os pedidos do dia filtrando por data na API Maxlav. ' +
      'Ideal para onboarding de novos clientes.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: MaxlavImportHistoricalSalesDto })
  @ApiResponse({
    status: 200,
    description: 'Importação histórica iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação histórica Maxlav iniciada com sucesso',
        totalDays: 90,
        startDate: '2025-01-30',
        endDate: '2025-04-29',
        jobsCreated: 90,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada ou integração Maxlav não configurada',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: MaxlavImportHistoricalSalesDto,
  ) {
    return this.maxlavSalesService.importHistoricalSales(companyId, importDto);
  }
}
