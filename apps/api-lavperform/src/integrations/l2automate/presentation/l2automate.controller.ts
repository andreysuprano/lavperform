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
import { L2AutomateSalesService } from '../application/l2automate-sales.service';
import { L2AutomateImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('L2 Automate Integration')
@Controller('companies/:companyId/l2automate')
export class L2AutomateController {
  constructor(
    private readonly l2AutomateSalesService: L2AutomateSalesService,
  ) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas do L2 Automate (Bolha de Sabão)',
    description:
      'Importa vendas retroativas (padrão: últimos 90 dias) para processamento. Ideal para onboarding de novos clientes.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: L2AutomateImportHistoricalSalesDto })
  @ApiResponse({
    status: 200,
    description: 'Importação histórica iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação histórica L2 Automate iniciada com sucesso',
        totalDays: 90,
        startDate: '2024-12-08',
        endDate: '2025-03-08',
        jobsCreated: 90,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description:
      'Empresa não encontrada ou integração L2 Automate não configurada',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: L2AutomateImportHistoricalSalesDto,
  ) {
    return this.l2AutomateSalesService.importHistoricalSales(
      companyId,
      importDto,
    );
  }
}
