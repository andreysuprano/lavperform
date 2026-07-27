import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { AutomaticCampaignStatus, AutomaticCampaignType, CampaignChannel } from '@prisma/client';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminAutomaticCampaignsService } from './admin-automatic-campaigns.service';
import { AutomaticCampaignAdminFilterDto } from './dto/automatic-campaign-admin-filter.dto';
import { UpdateAutomaticCampaignAdminDto } from './dto/update-automatic-campaign-admin.dto';
import { UpdateAutomaticCampaignStatusDto } from './dto/campaign-status.dto';
import { MessagesAdminFilterDto } from './dto/messages-admin-filter.dto';
import { CreateAutomaticCampaignDto } from '../../automatic-campaign/application/dto/create-automatic-campaign.dto';

@ApiTags('Admin Automatic Campaigns')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/automatic-campaigns')
export class AdminAutomaticCampaignsController {
  constructor(private readonly service: AdminAutomaticCampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar campanhas automáticas (todas as empresas) com filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'type', required: false, enum: AutomaticCampaignType })
  @ApiQuery({ name: 'status', required: false, enum: AutomaticCampaignStatus })
  @ApiQuery({ name: 'channel', required: false, enum: CampaignChannel })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'startDate >= startDate' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'startDate <= endDate' })
  @ApiQuery({ name: 'deleted', required: false, type: Boolean, description: 'Listar apenas deletadas (soft delete)' })
  findAll(@Query() filterDto: AutomaticCampaignAdminFilterDto) {
    return this.service.findAll(filterDto);
  }

  @Get(':id/diagnostic')
  @ApiOperation({
    summary: 'Diagnóstico de processamento e mensagens da campanha automática',
    description:
      'Retorna contagens por status, mensagens atrasadas/travadas, estado da integração Meta, ' +
      'templates e o último erro de processamento da campanha (lastProcessingError).',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  getDiagnostic(@Param('id') id: string) {
    return this.service.getDiagnostic(id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha automática por ID com criativos, métricas, erros e templates Meta' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar campanha automática (admin)' })
  create(@Body() createDto: CreateAutomaticCampaignDto & { companyId: string }) {
    return this.service.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar todos os campos de uma campanha automática (substitui criativos e brindes se fornecidos)' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  update(@Param('id') id: string, @Body() updateDto: UpdateAutomaticCampaignAdminDto) {
    return this.service.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status de uma campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  updateStatus(@Param('id') id: string, @Body() statusDto: UpdateAutomaticCampaignStatusDto) {
    return this.service.updateStatus(id, statusDto.status);
  }

  @Patch(':id/toggle-active')
  @ApiOperation({ summary: 'Ativar ou desativar campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  toggleActive(@Param('id') id: string) {
    return this.service.toggleActive(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocessar campanha automática: aborta mensagens pendentes e reenfileira' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  reprocess(@Param('id') id: string) {
    return this.service.reprocess(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete de campanha automática (admin)' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Post(':id/restore')
  @ApiOperation({ summary: 'Restaurar campanha automática deletada (admin)' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  restore(@Param('id') id: string) {
    return this.service.restore(id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensagens de uma campanha automática com filtros' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'status', required: false, enum: ['PENDING', 'SENT', 'PROCESSING', 'ERROR', 'ABORTED'], isArray: true })
  @ApiQuery({ name: 'channel', required: false, enum: CampaignChannel })
  @ApiQuery({ name: 'phone', required: false, type: String })
  @ApiQuery({ name: 'customerName', required: false, type: String })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  @ApiQuery({ name: 'error', required: false, type: String, description: 'Filtrar por texto do erro' })
  getMessages(@Param('id') id: string, @Query() filterDto: MessagesAdminFilterDto) {
    return this.service.getMessages(id, filterDto);
  }
}
