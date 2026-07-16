import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { MetaIntegrationService } from '../meta-integration.service';
import { ConnectMetaIntegrationDto } from '../dto/connect-meta-integration.dto';
import {
  MetaIntegrationAvailabilityResponseDto,
  MetaIntegrationResponseDto,
} from '../dto/meta-integration-response.dto';

@ApiTags('Meta Integration (WhatsApp Business API)')
@Controller('companies/:companyId/meta-integration')
export class MetaIntegrationController {
  constructor(private readonly metaIntegrationService: MetaIntegrationService) {}

  @Post('connect')
  @ApiOperation({
    summary: 'Conectar empresa à API Oficial do WhatsApp (Meta Cloud API)',
    description:
      'Recebe o access_token obtido pelo Embedded Signup da Meta, busca os dados da conta na API da Meta e armazena a integração vinculada à empresa. Também inscreve os webhooks automaticamente na WABA quando o waba_id é informado.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 201,
    description: 'Integração criada/atualizada com sucesso',
    type: MetaIntegrationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  @ApiResponse({
    status: 409,
    description: 'Empresa já possui integração Meta ativa',
  })
  async connect(
    @Param('companyId') companyId: string,
    @Body() dto: ConnectMetaIntegrationDto,
  ): Promise<MetaIntegrationResponseDto> {
    return this.metaIntegrationService.connect(companyId, dto);
  }

  @Get()
  @ApiOperation({
    summary: 'Buscar integração Meta da empresa',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Integração encontrada',
    type: MetaIntegrationResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Integração não encontrada' })
  async findByCompany(
    @Param('companyId') companyId: string,
  ): Promise<MetaIntegrationResponseDto> {
    return this.metaIntegrationService.findByCompany(companyId);
  }

  @Post('phone-status/refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconsultar status do número de telefone na Meta Cloud API',
    description:
      'Força uma chamada GET /v25.0/{phoneNumberId} na Meta Graph API para obter o status atualizado do número (status, code_verification_status, platform_type) e atualizar o flag phoneNumberRegistered. Use quando o número ainda não estiver registrado para verificar se o registro foi concluído.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Status do número atualizado com sucesso',
    type: MetaIntegrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Integração não possui phoneNumberId configurado',
  })
  @ApiResponse({ status: 404, description: 'Integração não encontrada' })
  async refreshPhoneStatus(
    @Param('companyId') companyId: string,
  ): Promise<MetaIntegrationResponseDto> {
    return this.metaIntegrationService.refreshPhoneStatus(companyId);
  }

  @Post('phone-status/register')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Registrar o número de telefone no WhatsApp Cloud API',
    description:
      'Chama POST /v25.0/{phoneNumberId}/register usando como PIN os 6 últimos dígitos do telefone configurado. Em seguida sincroniza o status do número para atualizar o flag phoneNumberRegistered. Esse endpoint é disparado automaticamente após a criação da integração; use manualmente para retries quando o registro automático falhar.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Número registrado e status sincronizado com sucesso',
    type: MetaIntegrationResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Integração não possui phoneNumberId ou telefone inválido para gerar o PIN',
  })
  @ApiResponse({ status: 404, description: 'Integração não encontrada' })
  @ApiResponse({
    status: 422,
    description: 'Meta Cloud API recusou o registro (PIN incorreto, número bloqueado, etc.)',
  })
  async registerPhoneNumber(
    @Param('companyId') companyId: string,
  ): Promise<MetaIntegrationResponseDto> {
    return this.metaIntegrationService.registerPhoneNumber(companyId);
  }

  @Get('availability')
  @ApiOperation({
    summary: 'Verificar disponibilidade do canal API Oficial da Meta',
    description:
      'Retorna se a empresa possui integração Meta ativa e completa para habilitar o canal WHATSAPP_BUSINESS_API na interface.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Disponibilidade da integração Meta',
    type: MetaIntegrationAvailabilityResponseDto,
  })
  async getAvailability(
    @Param('companyId') companyId: string,
  ): Promise<MetaIntegrationAvailabilityResponseDto> {
    return this.metaIntegrationService.getAvailability(companyId);
  }

  @Delete('disconnect')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Revogar integração Meta da empresa',
    description:
      'Marca a integração como REVOKED. O access_token não é invalidado na Meta   para revogar permissões é necessário fazê-lo manualmente no Meta Business Manager.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 204, description: 'Integração revogada com sucesso' })
  @ApiResponse({ status: 404, description: 'Integração não encontrada' })
  async disconnect(@Param('companyId') companyId: string): Promise<void> {
    return this.metaIntegrationService.disconnect(companyId);
  }
}
