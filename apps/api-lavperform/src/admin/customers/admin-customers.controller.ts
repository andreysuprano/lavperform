import { Controller, Get, Query, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { exportFileMeta, normalizeExportFormat } from '../../common/spreadsheet/rows-to-xlsx';
import { AdminCustomersService } from './admin-customers.service';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customersService: AdminCustomersService) {}

  @Get('export')
  @ApiQuery({ name: 'format', required: false, enum: ['csv', 'xls', 'xlsx'] })
  @ApiOperation({
    summary: 'Exportar todos os clientes de todas as lavanderias em CSV ou Excel',
  })
  @ApiResponse({ status: 200, description: 'Arquivo da base completa' })
  async exportCustomers(@Query('format') format?: string) {
    const normalized = normalizeExportFormat(format);
    const meta = exportFileMeta(normalized);
    const options = {
      type: meta.type,
      disposition: `attachment; filename="${meta.filename}"`,
    };

    if (normalized === 'xlsx') {
      return new StreamableFile(await this.customersService.createXlsx(), options);
    }

    return new StreamableFile(this.customersService.createExportStream(), options);
  }
}
