import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { MetaMessagingService } from '../application/meta-messaging.service';
import { MetaTemplatesService } from '../application/meta-templates.service';
import {
  CreateMetaTemplateDto,
  MetaTemplateSyncAllResponseDto,
} from '../dto/create-meta-template.dto';
import {
  MetaTemplateResponseDto,
  MetaTemplateSyncResponseDto,
  SendTestTemplateMessageDto,
  SendTestTemplateMessageResponseDto,
} from '../dto/meta-template-response.dto';

@ApiTags('Meta Templates (WhatsApp Business API)')
@Controller('companies/:companyId/meta-templates')
export class MetaTemplatesController {
  constructor(
    private readonly metaTemplatesService: MetaTemplatesService,
    private readonly metaMessagingService: MetaMessagingService,
  ) {}

  @Get()
  @ApiOperation({
    summary: 'Listar templates Meta da empresa',
    description:
      'Lista os templates criados automaticamente a partir dos criativos das campanhas de API Oficial.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Templates encontrados',
    type: MetaTemplateResponseDto,
    isArray: true,
  })
  async findAll(
    @Param('companyId') companyId: string,
  ): Promise<MetaTemplateResponseDto[]> {
    return this.metaTemplatesService.findAllByCompany(companyId);
  }

  @Post()
  @ApiOperation({
    summary: 'Criar template Meta standalone',
    description:
      'Cria um novo template na Meta Cloud API a partir dos componentes informados (header, body, footer, botões). Templates standalone não ficam vinculados a campanhas no momento da criação.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 201,
    description: 'Template criado (status PENDING ou ERROR)',
    type: MetaTemplateResponseDto,
  })
  async create(
    @Param('companyId') companyId: string,
    @Body() dto: CreateMetaTemplateDto,
  ): Promise<MetaTemplateResponseDto> {
    return this.metaTemplatesService.createStandalone(companyId, dto);
  }

  @Patch(':id')
  @ApiOperation({
    summary: 'Editar template Meta standalone',
    description:
      'Atualiza um template existente na Meta Cloud API. O conteúdo volta para análise após a edição. Categoria só pode ser alterada quando o template está REJECTED ou PAUSED.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID local do template' })
  @ApiResponse({
    status: 200,
    description: 'Template atualizado (status PENDING ou ERROR)',
    type: MetaTemplateResponseDto,
  })
  async update(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
    @Body() dto: CreateMetaTemplateDto,
  ): Promise<MetaTemplateResponseDto> {
    return this.metaTemplatesService.updateStandalone(companyId, id, dto);
  }

  @Post('sync-all')
  @ApiOperation({
    summary: 'Sincronizar status de todos os templates pendentes',
    description:
      'Consulta a Meta para todos os templates da empresa que ainda podem mudar de status (PENDING, IN_APPEAL, REJECTED, ERROR) e atualiza o banco local.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Resumo da sincronização',
    type: MetaTemplateSyncAllResponseDto,
  })
  async syncAll(
    @Param('companyId') companyId: string,
  ): Promise<MetaTemplateSyncAllResponseDto> {
    return this.metaTemplatesService.syncAllForCompany(companyId);
  }

  @Post('send-test')
  @ApiOperation({
    summary: 'Enviar mensagem de teste com template Meta',
    description:
      'Envia uma mensagem de teste para um número usando um template aprovado da empresa. Utiliza a integração Meta configurada para o companyId. Valida que o número da empresa está registrado no Cloud API. Aceita variáveis do body do template via `bodyParameters` (substituem {{1}}, {{2}}...).',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 201,
    description: 'Mensagem enviada com sucesso',
    type: SendTestTemplateMessageResponseDto,
  })
  @ApiResponse({
    status: 400,
    description:
      'Integração Meta incompleta, número não registrado, template não aprovado ou número inválido',
  })
  @ApiResponse({
    status: 422,
    description: 'Meta Cloud API recusou o envio (retorno error.code + error.message)',
  })
  async sendTest(
    @Param('companyId') companyId: string,
    @Body() dto: SendTestTemplateMessageDto,
  ): Promise<SendTestTemplateMessageResponseDto> {
    return this.metaMessagingService.sendTestTemplateMessage(
      companyId,
      dto.to,
      dto.templateId,
      dto.bodyParameters ?? [],
    );
  }

  @Get(':id/sync')
  @ApiOperation({
    summary: 'Sincronizar status de um template Meta',
    description:
      'Consulta o status atual do template na Meta e atualiza o banco local se houver diferença.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID local do template' })
  @ApiResponse({
    status: 200,
    description: 'Template sincronizado',
    type: MetaTemplateSyncResponseDto,
  })
  async syncStatus(
    @Param('companyId') companyId: string,
    @Param('id') id: string,
  ): Promise<MetaTemplateSyncResponseDto> {
    return this.metaTemplatesService.syncStatus(companyId, id);
  }
}
