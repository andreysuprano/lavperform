import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Put } from '@nestjs/common';
import { CompaniesService } from '../application/companies.service';
import { CreateCompanyDto } from '../application/dto/create-company.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { ApiQuery, ApiTags, ApiOperation, ApiParam, ApiBody, ApiResponse } from '@nestjs/swagger';
import { UpdateAvatarDto } from '../application/dto/update-avatar.dto';
import { Company } from '../../common/decorators/company.decorator';
import { UpdateCompanyDto } from '../application/dto/update-company.dto';
import { AuthGuard } from '@nestjs/passport';
import { ApiBearerAuth } from '@nestjs/swagger';
import { PutCardDto } from '../../integrations/asaas/dto/put-card.dto';
import { OpeningHoursDto } from '../application/dto/opening-hours.dto';
import { CompanyStatus } from '@prisma/client';
import { ImportOrderHistoryDto } from '../application/dto/import-order-history.dto';

@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
@ApiTags('Companies')
@Controller('companies')
export class CompaniesController {
  constructor(private readonly companiesService: CompaniesService) { }

  @Post()
  @ApiOperation({ summary: 'Criar uma nova empresa' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as empresas' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Quantidade de itens por página' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação' })
  @ApiQuery({ name: 'orderDirection', required: false, type: String, description: 'Direção da ordenação (asc/desc)' })
  @ApiQuery({ name: 'id', required: false, type: Number, description: 'Filtrar por ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial para filtro' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final para filtro' })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.companiesService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar uma empresa por ID' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Patch(':id/state/:state')
  @ApiOperation({ summary: 'Status de uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiParam({ name: 'state', description: 'Status da empresa', enum: CompanyStatus })
  updateCompanyState(@Param('id') id: string, @Param('state') state: CompanyStatus) {
    return this.companiesService.updateCompanyState(id, state);
  }

  @Patch(':id/avatar')
  @ApiOperation({ summary: 'Atualiza o avatar da empresa autenticada' })
  @ApiBody({ type: UpdateAvatarDto })
  @ApiResponse({ status: 200, description: 'Avatar atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  updateAvatar(@Param('id') id: string, @Body() updateAvatarDto: UpdateAvatarDto) {
    return this.companiesService.updateAvatar(id, updateAvatarDto);
  }

  @Post(':companyId/order-history')
  @ApiOperation({
    summary: 'Importar histórico de pedidos retroativo',
    description:
      'Inicia a importação retroativa de pedidos do Cardápio Web para um intervalo de datas. ' +
      'Os pedidos são importados dia a dia, respeitando o rate limit da API (5 req/min). ' +
      'Se as datas não forem informadas, importa os últimos 90 dias.',
  })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiBody({ type: ImportOrderHistoryDto, required: false })
  @ApiResponse({
    status: 201,
    description: 'Importação iniciada com sucesso',
    schema: {
      example: {
        message: 'Importação iniciada com sucesso',
        startDate: '2024-12-23',
        endDate: '2025-03-23',
        totalDays: 90,
        jobsCreated: 90,
      },
    },
  })
  importOrderHistory(
    @Param('companyId') companyId: string,
    @Body() importDto: ImportOrderHistoryDto,
  ) {
    return this.companiesService.importCompanyOrdersHistory(companyId, importDto);
  }

  @Get(':id/subscription')
  @ApiOperation({ summary: 'Buscar uma assinatura por ID da empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  findSubscription(@Param('id') id: string) {
    return this.companiesService.findSubscription(id);
  }

  @Get(':id/subscription/payments')
  @ApiOperation({ summary: 'Buscar os pagamentos de uma assinatura' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  findSubscriptionPayments(@Param('id') id: string) {
    return this.companiesService.findSubscriptionPayments(id);
  }

  @Get(':id/subscription/payments/:paymentId')
  @ApiOperation({ summary: 'Buscar os métodos de pagamento de um pagamento' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiParam({ name: 'paymentId', description: 'ID do pagamento' })
  findPaymentMethodInfo(@Param('id') id: string, @Param('paymentId') paymentId: string) {
    return this.companiesService.findPaymentMethodInfo(id, paymentId);
  }

  @Put(':id/subscription/credit-card')
  @ApiOperation({ summary: 'Adicionar um cartão de crédito à assinatura' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiBody({ type: PutCardDto })
  putCreditCardSubscription(@Param('id') id: string, @Body() cardData: PutCardDto) {
    return this.companiesService.putCreditCardSubscription(id, cardData);
  }

  @Get(':id/opening-hours')
  @ApiOperation({ summary: 'Buscar os horários de funcionamento de uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  findOpeningHours(@Param('id') id: string) {
    return this.companiesService.findOpeningHours(id);
  }

  @Post(':id/opening-hours')
  @ApiOperation({ summary: 'Criar um horário de funcionamento de uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  createOpeningHours(@Param('id') id: string, @Body() createOpeningHoursDto: OpeningHoursDto) {
    return this.companiesService.createOpeningHours(id, createOpeningHoursDto);
  }

  @Put(':id/opening-hours')
  @ApiOperation({ summary: 'Atualizar um horário de funcionamento de uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  putUpdateOpeningHours(@Param('id') id: string, @Body() updateOpeningHoursDto: OpeningHoursDto) {
    return this.companiesService.updateOpeningHours(id, updateOpeningHoursDto);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Listar todos os usuários de uma empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  listCompanyUsers(@Param('id') id: string) {
    return this.companiesService.listCompanyUsers(id);
  }
} 