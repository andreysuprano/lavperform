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
import { HybexEssenceSalesService } from '../application/essence-sales.service';
import { HybexEssenceImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Hybex Essence Integration')
@Controller('companies/:companyId/hybex-essence')
export class HybexEssenceController {
  constructor(
    private readonly essenceSalesService: HybexEssenceSalesService,
  ) {}

  @Post('import-historical-sales')
  @ApiOperation({
    summary: 'Importar vendas históricas da Hybex Essence (View Interface)',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiBody({ type: HybexEssenceImportHistoricalSalesDto })
  @ApiResponse({ status: 200, description: 'Importação histórica iniciada' })
  async importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() importDto: HybexEssenceImportHistoricalSalesDto,
  ) {
    return this.essenceSalesService.importHistoricalSales(companyId, importDto);
  }
}