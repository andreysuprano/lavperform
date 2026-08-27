import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';
import { AdminWhatsappService } from './admin-whatsapp.service';
import { AdminWhatsappConnectionLinkService } from './admin-whatsapp-connection-link.service';
import { CreateConnectionLinkDto } from './dto/create-connection-link.dto';
import { SetGlobalWebhookDto } from './dto/set-global-webhook.dto';
import { UpdateInstanceAdminFieldsDto } from './dto/update-instance-admin-fields.dto';

@ApiTags('Admin WhatsApp (UAZAPI)')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/whatsapp')
export class AdminWhatsappController {
  constructor(
    private readonly adminWhatsappService: AdminWhatsappService,
    private readonly connectionLinkService: AdminWhatsappConnectionLinkService,
  ) {}

  // ─── Instâncias ─────────────────────────────────────────────────────────

  @Get('instances')
  @ApiOperation({
    summary: 'Listar todas as instâncias UAZAPI',
    description:
      'Retorna todas as instâncias registradas na UAZAPI enriquecidas com os dados ' +
      'da empresa correspondente do nosso banco (via adminField02 = companyId).',
  })
  listAllInstances() {
    return this.adminWhatsappService.listAllInstances();
  }

  @Get('instances/company/:companyId')
  @ApiOperation({
    summary: 'Buscar instância UAZAPI de uma empresa específica',
    description: 'Retorna os dados da instância vinculada à empresa, incluindo status atual na UAZAPI.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  getInstanceByCompany(@Param('companyId') companyId: string) {
    return this.adminWhatsappService.getInstanceByCompany(companyId);
  }

  @Post('instances')
  @ApiOperation({
    summary: 'Criar instância UAZAPI (endpoint administrativo)',
    description:
      'Cria uma nova instância diretamente na UAZAPI sem passar pelo fluxo de empresa. ' +
      'Para vincular ao fluxo completo da plataforma use POST /admin/companies/:id/whatsapp.',
  })
  @ApiBody({
    schema: {
      type: 'object',
      required: ['name', 'companyId'],
      properties: {
        name: { type: 'string', example: 'lavanderia-exemplo' },
        companyId: { type: 'string', example: 'company-uuid' },
      },
    },
  })
  createInstance(@Body('name') name: string, @Body('companyId') companyId: string) {
    return this.adminWhatsappService.createInstance(name, companyId);
  }

  @Post('instances/:instanceToken/admin-fields')
  @ApiOperation({
    summary: 'Atualizar campos administrativos de uma instância',
    description:
      'Atualiza os campos administrativos (adminField01, adminField02, systemName) ' +
      'de uma instância existente na UAZAPI.',
  })
  @ApiParam({ name: 'instanceToken', description: 'Token da instância UAZAPI' })
  @ApiBody({ type: UpdateInstanceAdminFieldsDto })
  updateInstanceAdminFields(
    @Param('instanceToken') instanceToken: string,
    @Body() dto: UpdateInstanceAdminFieldsDto,
  ) {
    return this.adminWhatsappService.updateInstanceAdminFields(instanceToken, dto);
  }

  // ─── Links públicos de conexão ───────────────────────────────────────────

  @Post('connection-links')
  @ApiOperation({
    summary: 'Gerar link público de conexão WhatsApp',
    description:
      'Cria um link público para a empresa conectar o WhatsApp. Vincula empresa e instância UAZAPI, ' +
      'garantindo registro no banco quando necessário.',
  })
  @ApiBody({ type: CreateConnectionLinkDto })
  createConnectionLink(@Body() dto: CreateConnectionLinkDto) {
    return this.connectionLinkService.createConnectionLink(dto);
  }

  @Get('connection-links')
  @ApiOperation({ summary: 'Listar links de conexão de uma empresa' })
  @ApiQuery({ name: 'companyId', required: true, description: 'ID da empresa' })
  listConnectionLinks(@Query('companyId') companyId: string) {
    return this.connectionLinkService.listConnectionLinks(companyId);
  }

  @Post('connection-links/:linkId/revoke')
  @ApiOperation({ summary: 'Revogar um link público de conexão' })
  @ApiParam({ name: 'linkId', description: 'ID do link de conexão' })
  revokeConnectionLink(@Param('linkId') linkId: string) {
    return this.connectionLinkService.revokeConnectionLink(linkId);
  }

  // ─── Webhook Global ──────────────────────────────────────────────────────

  @Get('webhook/global')
  @ApiOperation({ summary: 'Ver configuração do webhook global da UAZAPI' })
  getGlobalWebhook() {
    return this.adminWhatsappService.getGlobalWebhook();
  }

  @Post('webhook/global')
  @ApiOperation({ summary: 'Configurar webhook global da UAZAPI' })
  @ApiBody({ type: SetGlobalWebhookDto })
  setGlobalWebhook(@Body() dto: SetGlobalWebhookDto) {
    return this.adminWhatsappService.setGlobalWebhook(dto);
  }

  @Get('webhook/global/errors')
  @ApiOperation({ summary: 'Ver últimos erros do webhook global da UAZAPI' })
  @ApiResponse({ status: 200, description: 'Lista dos últimos erros registrados no webhook global' })
  getGlobalWebhookErrors() {
    return this.adminWhatsappService.getGlobalWebhookErrors();
  }

  // ─── Operações de sistema ────────────────────────────────────────────────

  @Post('restart')
  @ApiOperation({
    summary: 'Reiniciar a aplicação UAZAPI',
    description: 'Envia comando de restart para o servidor UAZAPI. Todas as instâncias serão reconectadas.',
  })
  @ApiResponse({ status: 201, description: 'Comando de restart enviado com sucesso' })
  restartApplication() {
    return this.adminWhatsappService.restartApplication();
  }

  @Post('token/rotate')
  @ApiOperation({
    summary: 'Rotacionar o admin token da UAZAPI',
    description:
      'Gera um novo admin token. Após rotacionar, atualize a variável de ambiente ' +
      'UAZAPI_ADMIN_API_KEY com o novo valor retornado.',
  })
  @ApiResponse({ status: 201, description: 'Novo admin token gerado' })
  rotateAdminToken() {
    return this.adminWhatsappService.rotateAdminToken();
  }
}
