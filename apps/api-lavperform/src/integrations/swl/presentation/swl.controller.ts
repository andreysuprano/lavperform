import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { SwlSalesService } from '../application/swl-sales.service';
import { SwlImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('SWL Integration')
@Controller('companies/:companyId/swl')
export class SwlController {
  constructor(private readonly swlSalesService: SwlSalesService) {}

  @Post('import-historical-sales')
  importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() dto: SwlImportHistoricalSalesDto,
  ) {
    return this.swlSalesService.importHistoricalSales(companyId, dto);
  }
}
