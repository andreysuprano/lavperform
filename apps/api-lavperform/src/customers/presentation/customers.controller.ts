import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Inject } from '@nestjs/common';
import { CustomersService } from '../application/customers.service';
import { CreateCustomerDto } from '../application/dto/create-customer.dto';
import { UpdateCustomerDto } from '../application/dto/update-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CustomerPaginationDto } from '../application/dto/customer-pagination.dto';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiQuery, ApiParam } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { Company } from '../../common/decorators/company.decorator';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { QUEUE_NAMES } from '../../common/queue/queue.constants';

@ApiTags('Customers')
@Controller('companies/:companyId/customers')
@UseGuards(AuthGuard('jwt'))
@ApiBearerAuth()
export class CustomersController {
  constructor(
    private readonly customersService: CustomersService,
    @InjectQueue(QUEUE_NAMES.CUSTOMERS_IMPORT) private readonly customersQueue: Queue,
  ) { }

  @Post()
  @ApiOperation({ summary: 'Criar um novo cliente' })
  @ApiResponse({ status: 201, description: 'Cliente criado com sucesso' })
  @ApiResponse({ status: 400, description: 'Dados inválidos' })
  @ApiBody({ type: CreateCustomerDto })
  create(@Param('companyId') companyId: string, @Body() createCustomerDto: CreateCustomerDto) {
    return this.customersService.create(companyId, createCustomerDto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todos os clientes' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Número da página' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Quantidade de itens por página' })
  @ApiQuery({ name: 'orderBy', required: false, type: String, description: 'Campo para ordenação' })
  @ApiQuery({ name: 'orderDirection', required: false, type: String, description: 'Direção da ordenação (asc/desc)' })
  @ApiQuery({ name: 'id', required: false, type: String, description: 'Filtrar por ID' })
  @ApiQuery({ name: 'startDate', required: false, type: String, description: 'Data inicial para filtro' })
  @ApiQuery({ name: 'endDate', required: false, type: String, description: 'Data final para filtro' })
  @ApiQuery({ name: 'rfvClassification', required: false, isArray: true, type: String, description: 'Filtrar por categoria(s) RFV ou lead (ex: campeao, fiel, lead)' })
  @ApiQuery({ name: 'hasEmail', required: false, type: Boolean, description: 'Filtrar clientes com ou sem e-mail' })
  @ApiQuery({ name: 'hasBirthDate', required: false, type: Boolean, description: 'Filtrar clientes com ou sem data de nascimento' })
  @ApiQuery({ name: 'whatsappOptin', required: false, type: Boolean, description: 'Filtrar por opt-in de WhatsApp' })
  @ApiQuery({ name: 'whatsappVerified', required: false, type: Boolean, description: 'Filtrar por WhatsApp verificado' })
  @ApiQuery({ name: 'hasOrders', required: false, type: Boolean, description: 'Filtrar leads (sem pedidos) ou clientes com pedidos' })
  @ApiResponse({ status: 200, description: 'Lista de clientes' })
  findAll(@Param('companyId') companyId: string, @Query() paginationDto: CustomerPaginationDto) {
    return this.customersService.findAll(companyId, paginationDto);
  }

  @Get('summary')
  @ApiOperation({ summary: 'Obter resumo de segmentação de clientes' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Resumo de segmentação de clientes' })
  summary(@Param('companyId') companyId: string) {
    return this.customersService.totalCustomersBySegmentation(companyId);
  }

  @Get('top')
  @ApiOperation({ summary: 'Ranking de clientes que mais compram' })
  @ApiParam({ name: 'companyId', description: 'ID da empresa' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Quantidade de clientes (padrão 10, máx 50)' })
  @ApiQuery({
    name: 'sortBy',
    required: false,
    enum: ['totalSpent', 'orderCount'],
    description: 'Ordenação: totalSpent (padrão) ou orderCount',
  })
  @ApiResponse({ status: 200, description: 'Ranking de clientes por valor total gasto ou número de pedidos' })
  findTopBuyers(
    @Param('companyId') companyId: string,
    @Query('limit') limit?: string,
    @Query('sortBy') sortBy?: string,
  ) {
    const parsedLimit = limit ? Number(limit) : 10;
    const parsedSortBy =
      sortBy === 'orderCount' ? 'orderCount' : 'totalSpent';
    return this.customersService.findTopBuyers(
      companyId,
      Number.isFinite(parsedLimit) ? parsedLimit : 10,
      parsedSortBy,
    );
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar um cliente por ID' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  findOne(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.findOne(companyId, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar um cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiBody({ type: CreateCustomerDto })
  @ApiResponse({ status: 200, description: 'Cliente atualizado com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  update(@Param('companyId') companyId: string, @Param('id') id: string, @Body() updateCustomerDto: UpdateCustomerDto) {
    return this.customersService.update(companyId, id, updateCustomerDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remover um cliente' })
  @ApiParam({ name: 'id', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente removido com sucesso' })
  @ApiResponse({ status: 404, description: 'Cliente não encontrado' })
  remove(@Param('companyId') companyId: string, @Param('id') id: string) {
    return this.customersService.remove(companyId, id);
  }

  @Get('phone/:phone')
  @ApiOperation({ summary: 'Buscar um cliente por telefone' })
  @ApiParam({ name: 'phone', description: 'Telefone do cliente' })
  @ApiResponse({ status: 200, description: 'Cliente encontrado ou null' })
  findByPhone(@Param('companyId') companyId: string, @Param('phone') phone: string) {
    return this.customersService.findByPhone(companyId, phone);
  }

  @Post('import')
  @ApiOperation({ summary: 'Importar clientes em massa' })
  @ApiResponse({ status: 200, description: 'Importação iniciada com sucesso' })
  async importCustomers(
    @Param('companyId') companyId: string,
    @Body() customers: CreateCustomerDto[],
  ) {
    return this.customersService.importCustomers(companyId, customers);
  }

  @Post('validate-whatsapp')
  @ApiOperation({ summary: 'Enfileirar validação de WhatsApp para todos os clientes da empresa' })
  @ApiResponse({ status: 200, description: 'Validação de WhatsApp enfileirada com sucesso' })
  async validateWhatsappForCompany(
    @Param('companyId') companyId: string,
  ) {
    return this.customersService.enqueueWhatsappValidationForCompany(companyId);
  }

  @Get('behavior/:customerId')
  @ApiOperation({ summary: 'Obter comportamento de um cliente' })
  @ApiParam({ name: 'customerId', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Comportamento do cliente' })
  getCustomerBehavior(@Param('companyId') companyId: string,@Param('customerId') customerId: string) {
    return this.customersService.getCustomerBehavior(customerId);
  }

  @Get('messages/:customerId')
  @ApiOperation({ summary: 'Buscar últimas mensagens enviadas para um cliente' })
  @ApiParam({ name: 'customerId', description: 'ID do cliente' })
  @ApiResponse({ status: 200, description: 'Últimas mensagens enviadas para o cliente' })
  getLastMessagesSentToCustomer(@Param('companyId') companyId: string, @Param('customerId') customerId: string, @Query() paginationDto: PaginationDto) {
    return this.customersService.getLastMessagesSentToCustomer(customerId, paginationDto);
  }
} 