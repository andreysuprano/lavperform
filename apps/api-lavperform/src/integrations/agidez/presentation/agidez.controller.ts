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
import { AgidezSalesService } from '../application/agidez-sales.service';
import { AgidezImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Agidez Integration')
@Controller('companies/:companyId/agidez')
export class AgidezController {
  constructor(private readonly agidezSalesService: AgidezSalesService) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas da Agidez (View Interface)',
    description:
      'Enfileira a carga de clientes e um job por dia no período. ' +
      'Cada job busca tickets, serviços e produtos na API View Interface.',
  })
  @ApiParam({
    name: 'companyId',
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiBody({ type: AgidezImportHistoricalSalesDto })
  @ApiResponse({
    status: 200,
    description: 'Importação histórica iniciada com sucesso',
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada ou integração Agidez não configurada',
  })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: AgidezImportHistoricalSalesDto,
  ) {
    return this.agidezSalesService.importHistoricalSales(companyId, importDto);
  }
}
