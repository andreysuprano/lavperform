import { Controller, Post, Body, Get, Param, Delete } from '@nestjs/common';
import { WhatsappService } from '../application/whatsapp.service';
import { CreateCompanyInstanceResponseDto } from '../application/dto/create-company-instance-response.dto';
import { InstanceConnectionResponseDto } from '../application/dto/instance-connection-response.dto';
import { InstanceStatusResponseDto } from '../application/dto/instance-status-response.dto';
import { ApiTags, ApiOperation, ApiParam, ApiResponse } from '@nestjs/swagger';

@ApiTags('WhatsApp')
@Controller('whatsapp')
export class WhatsappController {
  constructor(private readonly whatsappService: WhatsappService) { }

  @Post('companies/:companyId/instances')
  @ApiOperation({ summary: 'Criar uma nova instância do WhatsApp para uma empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 201,
    description: 'Instância criada com sucesso',
    type: CreateCompanyInstanceResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Empresa não encontrada'
  })
  @ApiResponse({
    status: 409,
    description: 'Já existe uma instância ativa para esta empresa'
  })
  async createCompanyInstance(
    @Param('companyId') companyId: string,
  ): Promise<CreateCompanyInstanceResponseDto> {
    return this.whatsappService.createCompanyInstance(companyId);
  }

  @Get('companies/:companyId/instances/connection')
  @ApiOperation({ summary: 'Obter QR Code e informações de conexão da instância' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Informações de conexão obtidas com sucesso',
    type: InstanceConnectionResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Instância não encontrada para esta empresa'
  })
  async getInstanceConnection(
    @Param('companyId') companyId: string,
  ): Promise<InstanceConnectionResponseDto> {
    return this.whatsappService.getInstanceConnection(companyId);
  }

  @Get('companies/:companyId/instances/status')
  @ApiOperation({ summary: 'Obter status atual da instância' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 200,
    description: 'Status da instância obtido com sucesso',
    type: InstanceStatusResponseDto
  })
  @ApiResponse({
    status: 404,
    description: 'Instância não encontrada para esta empresa'
  })
  async getInstanceStatus(
    @Param('companyId') companyId: string,
  ): Promise<InstanceStatusResponseDto> {
    return this.whatsappService.getInstanceStatus(companyId);
  }

  @Delete('companies/:companyId/instances')
  @ApiOperation({ summary: 'Excluir a instância do WhatsApp de uma empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({
    status: 204,
    description: 'Instância excluída com sucesso'
  })
  @ApiResponse({
    status: 404,
    description: 'Instância não encontrada para esta empresa'
  })
  async deleteInstance(
    @Param('companyId') companyId: string,
  ): Promise<void> {
    return this.whatsappService.deleteInstance(companyId);
  }

  @Get('companies/:companyId/contacts')
  @ApiOperation({ summary: 'Obter contatos da empresa' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  async getContactsFromCompany(
    @Param('companyId') companyId: string,
  ): Promise<any> {
    return this.whatsappService.getAllConversationContactsFromCompany(companyId);
  }

} 