import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminIntegrationsService } from './admin-integrations.service';

@ApiTags('Admin Integrations')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/integrations')
export class AdminIntegrationsController {
  constructor(private readonly adminIntegrationsService: AdminIntegrationsService) {}

  @Get('partners')
  @ApiOperation({ summary: 'Listar catálogo de parceiros integradores' })
  listPartners() {
    return this.adminIntegrationsService.listPartners();
  }
}
