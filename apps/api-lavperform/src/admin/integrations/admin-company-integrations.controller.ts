import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ImportOrderHistoryDto } from '../../companies/application/dto/import-order-history.dto';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminIntegrationsService } from './admin-integrations.service';
import { CreateAdminIntegrationDto } from './dto/create-admin-integration.dto';
import { ToggleIntegrationActiveDto } from './dto/toggle-integration-active.dto';
import { UpdateAdminIntegrationDto } from './dto/update-admin-integration.dto';

@ApiTags('Admin Company Integrations')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/companies/:companyId/integrations')
export class AdminCompanyIntegrationsController {
  constructor(private readonly adminIntegrationsService: AdminIntegrationsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar integrações de cardápio/PDV da empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiQuery({
    name: 'revealSecrets',
    required: false,
    type: Boolean,
    description: 'Retorna credenciais em texto claro',
  })
  list(
    @Param('companyId') companyId: string,
    @Query('revealSecrets') revealSecrets?: string,
  ) {
    return this.adminIntegrationsService.listCompanyIntegrations(
      companyId,
      revealSecrets === 'true',
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar integração por ID' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da integração' })
  @ApiQuery({ name: 'revealSecrets', required: false, type: Boolean })
  findOne(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Query('revealSecrets') revealSecrets?: string,
  ) {
    return this.adminIntegrationsService.getCompanyIntegration(
      companyId,
      id,
      revealSecrets === 'true',
    );
  }

  @Post()
  @ApiOperation({ summary: 'Criar ou atualizar integração (upsert por parceiro)' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateAdminIntegrationDto,
  ) {
    return this.adminIntegrationsService.createCompanyIntegration(companyId, dto);
  }

  @Patch(':id/active')
  @ApiOperation({ summary: 'Ativar ou desativar integração' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da integração' })
  toggleActive(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ToggleIntegrationActiveDto,
  ) {
    return this.adminIntegrationsService.toggleIntegrationActive(
      companyId,
      id,
      dto.active,
    );
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar credenciais da integração' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da integração' })
  update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: UpdateAdminIntegrationDto,
  ) {
    return this.adminIntegrationsService.updateCompanyIntegration(
      companyId,
      id,
      dto,
    );
  }

  @Post(':id/import-history')
  @ApiOperation({ summary: 'Importar histórico de pedidos da integração' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da integração' })
  importHistory(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: ImportOrderHistoryDto,
  ) {
    return this.adminIntegrationsService.importHistory(companyId, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover integração' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da integração' })
  async remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    await this.adminIntegrationsService.deleteCompanyIntegration(companyId, id);
  }
}
