import {
  Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiTags,
} from '@nestjs/swagger';
import { CampaignChannel, CampaignStatus } from '@prisma/client';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminCampaignsService } from './admin-campaigns.service';
import { CampaignAdminFilterDto } from './dto/campaign-admin-filter.dto';
import { UpdateCampaignAdminDto } from './dto/update-campaign-admin.dto';
import { UpdateCampaignStatusDto } from './dto/campaign-status.dto';
import { MessagesAdminFilterDto } from './dto/messages-admin-filter.dto';
import { CreateCampaignDto } from '../../campaigns/application/dto/create-campaign.dto';

@ApiTags('Admin Campaigns')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/campaigns')
export class AdminCampaignsController {
  constructor(private readonly service: AdminCampaignsService) {}

  @Get()
  @ApiOperation({ summary: 'Listar campanhas agendadas (todas as empresas) com filtros' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, enum: ['asc', 'desc'] })
  @ApiQuery({ name: 'companyId', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'status', required: false, enum: CampaignStatus })
  @ApiQuery({ name: 'channel', required: false, enum: CampaignChannel })
  @ApiQuery({ name: 'modifiedByAI', required: false, type: Boolean })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'scheduledDate >= startDate' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'scheduledDate <= endDate' })
  @ApiQuery({ name: 'trakingCode', required: false, type: String })
  findAll(@Query() filterDto: CampaignAdminFilterDto) {
    return this.service.findAll(filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar campanha agendada por ID com métricas e amostra de erros' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar campanha agendada (admin)' })
  create(@Body() createDto: CreateCampaignDto & { companyId: string }) {
    return this.service.create(createDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Editar todos os campos de uma campanha agendada' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  update(@Param('id') id: string, @Body() updateDto: UpdateCampaignAdminDto) {
    return this.service.update(id, updateDto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Alterar status de uma campanha agendada' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  updateStatus(@Param('id') id: string, @Body() statusDto: UpdateCampaignStatusDto) {
    return this.service.updateStatus(id, statusDto.status);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocessar campanha agendada: cancela mensagens pendentes e reenfileira' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  reprocess(@Param('id') id: string) {
    return this.service.reprocess(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover campanha agendada (admin)' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/messages')
  @ApiOperation({ summary: 'Listar mensagens de uma campanha agendada com filtros' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
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
