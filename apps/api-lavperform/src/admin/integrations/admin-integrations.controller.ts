import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminIntegrationsService } from './admin-integrations.service';
import {
  CreateCatalogPartnerDto,
  UpdateCatalogPartnerDto,
} from './dto/catalog-partner.dto';

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

  @Post('partners')
  @ApiOperation({ summary: 'Criar parceiro integrador no catálogo' })
  createPartner(@Body() dto: CreateCatalogPartnerDto) {
    return this.adminIntegrationsService.createCatalogPartner(dto);
  }

  @Patch('partners/:partnerId')
  @ApiOperation({ summary: 'Editar parceiro integrador do catálogo' })
  updatePartner(
    @Param('partnerId') partnerId: string,
    @Body() dto: UpdateCatalogPartnerDto,
  ) {
    return this.adminIntegrationsService.updateCatalogPartner(partnerId, dto);
  }
}
