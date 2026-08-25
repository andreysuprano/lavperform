import { Controller, Get, Post, Body, Param, UseGuards, Put, Delete, Query } from '@nestjs/common';
import { AutomaticCampaignService } from '../application/automatic-campaign.service';
import { CreateAutomaticCampaignDto } from '../application/dto/create-automatic-campaign.dto';
import { UpdateAutomaticCampaignDto } from '../application/dto/update-automatic-campaign.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AutomaticCampaignFilterDto } from '../application/dto/automatic-campaign-filter.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam, ApiQuery } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { DateFilter } from '../../common/utils/dateFilter';
import { DateRangeFilterDto } from '../../common/dto/date-range-filter.dto';
import { CampaignMessagesFilterDto } from '../application/dto/campaign-messages-filter.dto';
import { MessageStatus } from '@prisma/client';
import { ALL_RFV_CLASSIFICATIONS } from '../../common/utils/rfvClassification';
import { DuplicateAutomaticCampaignDto } from '../application/dto/duplicate-automatic-campaign.dto';

@ApiTags('Automatic Campaigns')
@Controller('campaigns/automatic/:companyId/')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class AutomaticCampaignController {
  constructor(private readonly automaticCampaignService: AutomaticCampaignService) { }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova campanha automática' })
  @ApiResponse({ status: 201, description: 'Campanha automática criada com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiBody({ type: CreateAutomaticCampaignDto })
  create(
    @Param('companyId') companyId: string,
    @Body() createAutomaticCampaignDto: CreateAutomaticCampaignDto
  ) {
    return this.automaticCampaignService.create(companyId, createAutomaticCampaignDto);
  }

  @Post(':id/duplicate')
  @ApiOperation({
    summary: 'Duplicar uma campanha automática',
    description:
      'Cria uma nova campanha com os mesmos dados da referência (inclui brindes, criativos e cupom quando aplicável), prefixando o nome com "Cópia ". Reutiliza as validações da criação (ex.: cupom ativo e da empresa).',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática a duplicar' })
  @ApiResponse({ status: 201, description: 'Nova campanha criada como cópia' })
  @ApiResponse({ status: 404, description: 'Campanha não encontrada para esta empresa' })
  duplicate(
    @Param('companyId') companyId: string,
    @Param('id') campaignId: string,
    @Body() duplicateAutomaticCampaignDto: DuplicateAutomaticCampaignDto,
  ) {
    return this.automaticCampaignService.duplicate(
      companyId,
      campaignId,
      duplicateAutomaticCampaignDto?.targetType,
    );
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as campanhas automáticas de uma empresa' })
  @ApiResponse({ status: 200, description: 'Lista de campanhas automáticas' })
  findAll(
    @Param('companyId') companyId: string,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: AutomaticCampaignFilterDto,
  ) {
    return this.automaticCampaignService.findAll(companyId, paginationDto, filterDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma campanha automática por ID' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiResponse({ status: 200, description: 'Campanha automática encontrada' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  findOne(@Param('id') id: string) {
    return this.automaticCampaignService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Atualizar uma campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiBody({ type: UpdateAutomaticCampaignDto })
  @ApiResponse({ status: 200, description: 'Campanha automática atualizada com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  update(
    @Param('id') id: string,
    @Body() updateAutomaticCampaignDto: UpdateAutomaticCampaignDto,
  ) {
    return this.automaticCampaignService.update(id, updateAutomaticCampaignDto);
  }

  @Put(':id/toggle-active')
  @ApiOperation({ summary: 'Ativar/Desativar uma campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Status da campanha atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  toggleActive(
    @Param('id') id: string,
    @Param('companyId') companyId: string,
  ) {
    return this.automaticCampaignService.toggleActive(id, companyId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover uma campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiResponse({ status: 200, description: 'Campanha automática removida com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  remove(@Param('id') id: string) {
    return this.automaticCampaignService.remove(id);
  }


  @Get(':id/metrics')
  @ApiOperation({ summary: 'Buscar métricas de uma campanha automática' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiQuery({
    name: 'dateFilter',
    required: false,
    enum: DateFilter,
    description:
      'Filtro pré-definido em dias (7, 14 ou 30). Usado quando startDate/endDate não são enviados.',
  })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description: 'Data inicial (inclusiva) ISO 8601. Deve ser enviada com endDate.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description: 'Data final (inclusiva) ISO 8601. Deve ser enviada com startDate.',
  })
  @ApiResponse({ status: 200, description: 'Métricas da campanha automática encontradas' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  getCampaignMetrics(@Param('id') id: string, @Query() filter: DateRangeFilterDto) {
    return this.automaticCampaignService.getCampaignMetrics(id, filter);
  }

  @Get(':id/messages-diagnostic')
  @ApiOperation({
    summary: 'Diagnóstico das mensagens da campanha',
    description:
      'Retorna um raio-x do estado das mensagens: contagem por status, ' +
      'quantas PENDING estão com scheduledDate no passado (atrasadas), ' +
      'quantas PROCESSING ficaram travadas há mais de 10 min, último envio ' +
      'bem-sucedido, último erro, e — para canal WHATSAPP_BUSINESS_API — ' +
      'o estado dos templates Meta e da integração. ' +
      'Use quando "as mensagens foram geradas mas não foram enviadas".',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiResponse({ status: 200, description: 'Diagnóstico retornado com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  getMessagesDiagnostic(@Param('id') id: string) {
    return this.automaticCampaignService.getMessagesDiagnostic(id);
  }

  @Post(':id/reprocess')
  @ApiOperation({
    summary: 'Reprocessar uma campanha automática',
    description:
      'Apaga as mensagens PENDING do dia da campanha e a re-enfileira no motor de campanhas automáticas para gerar um novo lote de mensagens.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiResponse({ status: 200, description: 'Campanha enviada para reprocessamento com sucesso' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  reprocess(@Param('id') id: string) {
    return this.automaticCampaignService.reprocess(id);
  }

  @Post(':id/messages/reschedule-stuck')
  @ApiOperation({
    summary: 'Reescalonar mensagens travadas para envio imediato',
    description:
      'Pega todas as mensagens da campanha que ficaram travadas (PENDING ' +
      'com scheduledDate no passado OU PROCESSING há mais de 10 min) e as ' +
      'reescalona para now + 1min, distribuindo até 60 mensagens por minuto ' +
      'para não estourar rate-limit do provedor. O cron de envio pega no ' +
      'próximo tick (a cada 1 minuto).',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiResponse({
    status: 200,
    description:
      'Retorna contagem do que foi reescalonado: { rescheduledPending, recoveredProcessing, total }',
  })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  rescheduleStuckMessages(@Param('id') id: string) {
    return this.automaticCampaignService.rescheduleStuckMessages(id);
  }

  @Get(':id/messages')
  @ApiOperation({
    summary: 'Buscar mensagens de uma campanha automática',
    description:
      'Retorna as mensagens da campanha. O campo `segmentation` é o snapshot da classificação RFV do cliente no momento da criação da mensagem; `customerRfvClassification` é a classificação RFV atual do cliente.',
  })
  @ApiParam({ name: 'id', description: 'ID da campanha automática' })
  @ApiQuery({
    name: 'startDate',
    required: false,
    type: String,
    description:
      'Data inicial (inclusiva) ISO 8601. Se omitida junto com endDate, utiliza o dia atual.',
  })
  @ApiQuery({
    name: 'endDate',
    required: false,
    type: String,
    description:
      'Data final (inclusiva) ISO 8601. Se omitida junto com startDate, utiliza o dia atual.',
  })
  @ApiQuery({
    name: 'rfvClassification',
    required: false,
    isArray: true,
    type: String,
    enum: ALL_RFV_CLASSIFICATIONS,
    description: 'Filtrar por classificação RFV (pode ser múltiplas). Se omitido, retorna todas.',
  })
  @ApiQuery({
    name: 'status',
    required: false,
    isArray: true,
    enum: MessageStatus,
    description: 'Filtrar por status da mensagem (pode ser múltiplos). Se omitido, retorna todos.',
  })
  @ApiResponse({ status: 200, description: 'Mensagens da campanha automática encontradas' })
  @ApiResponse({ status: 400, description: 'Parâmetros de filtro inválidos' })
  @ApiResponse({ status: 404, description: 'Campanha automática não encontrada' })
  getCampaignMessages(
    @Param('id') id: string,
    @Query() filterDto: CampaignMessagesFilterDto,
  ) {
    return this.automaticCampaignService.getCampaignMessages(id, filterDto);
  }
}
