import { Controller, Get, Header, StreamableFile, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminCustomersService } from './admin-customers.service';

@ApiTags('Admin Customers')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/customers')
export class AdminCustomersController {
  constructor(private readonly customersService: AdminCustomersService) {}

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="clientes.csv"')
  @ApiOperation({
    summary: 'Exportar todos os clientes de todas as lavanderias em CSV',
  })
  @ApiResponse({ status: 200, description: 'Arquivo CSV da base completa' })
  exportCustomers() {
    return new StreamableFile(this.customersService.createExportStream());
  }
}
