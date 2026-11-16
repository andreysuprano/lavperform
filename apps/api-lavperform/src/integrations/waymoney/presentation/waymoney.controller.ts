import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { WaymoneySalesService } from '../application/waymoney-sales.service';
import { WaymoneyImportHistoricalSalesDto } from '../application/dto/import-historical-sales.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('WayMoney Integration')
@Controller('companies/:companyId/waymoney')
export class WaymoneyController {
  constructor(private readonly waymoneySalesService: WaymoneySalesService) {}

  @Post('import-historical-sales')
  importHistoricalSales(
    @Param('companyId') companyId: string,
    @Body() dto: WaymoneyImportHistoricalSalesDto,
  ) {
    return this.waymoneySalesService.importHistoricalSales(companyId, dto);
  }
}
