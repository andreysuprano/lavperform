import { Controller, Post, Param, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiParam, ApiResponse, ApiBearerAuth, ApiBody } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { VmLavSalesService } from '../application/vmlav-sales.service';
import { ImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('VM Lav Integration')
@Controller('companies/:companyId/vmlav')
export class VmLavController {
  constructor(private readonly vmLavSalesService: VmLavSalesService) {}

  @Post('import-historical-sales')
  @ApiOperation({ 
    summary: 'Importar vendas históricas do VM Lav',
    description: 'Importa vendas retroativas dos últimos 3 meses (ou período customizado) para processamento. Ideal para onboarding de novos clientes.'
  })
  @ApiParam({ 
    name: 'companyId', 
    description: 'ID da empresa',
    example: '123e4567-e89b-12d3-a456-426614174000'
  })
  @ApiBody({ type: ImportHistoricalSalesDto })
  @ApiResponse({ 
    status: 200, 
    description: 'Importação histórica iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação histórica iniciada com sucesso',
        totalDays: 90,
        startDate: '2024-12-08',
        endDate: '2025-03-08',
        jobsCreated: 90
      }
    }
  })
  @ApiResponse({ 
    status: 404, 
    description: 'Empresa não encontrada ou integração VM Lav não configurada' 
  })
  @ApiResponse({ 
    status: 400, 
    description: 'Parâmetros inválidos' 
  })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: ImportHistoricalSalesDto,
  ) {
    return this.vmLavSalesService.importHistoricalSales(companyId, importDto);
  }
}
