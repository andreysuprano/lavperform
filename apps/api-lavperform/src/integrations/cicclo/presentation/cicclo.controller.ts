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
import { CiccloSalesService } from '../application/cicclo-sales.service';
import { CiccloImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Cicclo Integration')
@Controller('companies/:companyId/cicclo')
export class CiccloController {
  constructor(private readonly ciccloSalesService: CiccloSalesService) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas do Cicclo',
    description:
      'Importa vendas retroativas (padrão: últimos 90 dias) para processamento. Ideal para onboarding de novos clientes.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: CiccloImportHistoricalSalesDto })
  @ApiResponse({
    status: 200,
    description: 'Importação histórica iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação histórica Cicclo iniciada com sucesso',
        totalDays: 90,
        startDate: '2024-12-08',
        endDate: '2025-03-08',
        jobsCreated: 90,
      },
    },
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada ou integração Cicclo não configurada',
  })
  @ApiResponse({ status: 400, description: 'Parâmetros inválidos' })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: CiccloImportHistoricalSalesDto,
  ) {
    return this.ciccloSalesService.importHistoricalSales(companyId, importDto);
  }
}
