import { Controller, Get, Post, Body, Param, UseGuards, Patch, Delete, Query } from '@nestjs/common';
import { CampaignsService } from '../application/campaigns.service';
import { CreateCampaignDto } from '../application/dto/create-campaign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CampaignFilterDto } from '../application/dto/campaign-filter.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { CampaignStatus } from '@prisma/client';
import { UpdateCampaignDto } from '../application/dto/update-campaign.dto';

@ApiTags('Campaigns')
@Controller('companies/:companyId/campaigns')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CampaignsController {
  constructor(private readonly campaignsService: CampaignsService) { }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova campanha' })
  @ApiResponse({ status: 201, description: 'Campanha criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiBody({ type: CreateCampaignDto })
  create(
    @Param('companyId') companyId: string,
    @Body() createCampaignDto: CreateCampaignDto
  ) {
    return this.campaignsService.create(companyId, createCampaignDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as campanhas' })
  @ApiResponse({ status: 200, description: 'Lista de campanhas' })
  findAll(
    @Param('companyId') companyId: string,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: CampaignFilterDto,
  ) {
    return this.campaignsService.findAll(companyId, paginationDto, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma campanha por ID' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  @ApiResponse({ status: 200, description: 'Campanha encontrada' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  findOne(@Param('id') id: string) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Atualizar status de uma campanha' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  @ApiResponse({ status: 200, description: 'Status atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  updateStatus(
    @Param('id') id: string,
    @Body('status') status: CampaignStatus,
  ) {
    return this.campaignsService.updateStatus(id, status);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma campanha' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  @ApiBody({ type: UpdateCampaignDto })
  @ApiResponse({ status: 200, description: 'Campanha atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateCampaignDto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(id, updateCampaignDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma campanha' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  @ApiResponse({ status: 200, description: 'Campanha removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  remove(@Param('id') id: string) {
    return this.campaignsService.remove(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({ summary: 'Reprocessar uma campanha' })
  @ApiParam({ name: 'id', description: 'ID da campanha' })
  @ApiResponse({ status: 200, description: 'Campanha enviada para reprocessamento com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada' })
  reprocess(@Param('id') id: string) {
    return this.campaignsService.reprocess(id);
  }
} 