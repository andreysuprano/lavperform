import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
import { CompanyStatus } from '@prisma/client';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { CompaniesService } from '../../companies/application/companies.service';
import { CreateCompanyDto } from '../../companies/application/dto/create-company.dto';
import { UpdateCompanyDto } from '../../companies/application/dto/update-company.dto';
import { CouponFilterDto } from '../../coupons/application/dto/coupon-filter.dto';
import { CouponsService } from '../../coupons/application/coupons.service';
import { CustomersService } from '../../customers/application/customers.service';
import { RfvEngineService } from '../../rfv-engine/application/rfv-engine.service';
import { AdminJwtGuard } from '../auth/guards/admin-jwt.guard';

@ApiTags('Admin Companies')
@ApiBearerAuth()
@UseGuards(AdminJwtGuard)
@Controller('admin/companies')
export class AdminCompaniesController {
  constructor(
    private readonly companiesService: CompaniesService,
    private readonly couponsService: CouponsService,
    private readonly customersService: CustomersService,
    private readonly rfvEngineService: RfvEngineService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Listar empresas no admin' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, type: String })
  @ApiQuery({ name: 'id', required: false, type: String })
  @ApiQuery({ name: 'name', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, enum: CompanyStatus })
  @ApiQuery({ name: 'startDate', required: false, type: String })
  @ApiQuery({ name: 'endDate', required: false, type: String })
  findAll(@Query() paginationDto: PaginationDto) {
    return this.companiesService.findAll(paginationDto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por ID no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Criar empresa no admin' })
  create(@Body() createCompanyDto: CreateCompanyDto) {
    return this.companiesService.create(createCompanyDto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar empresa no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  update(@Param('id') id: string, @Body() updateCompanyDto: UpdateCompanyDto) {
    return this.companiesService.update(id, updateCompanyDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Soft-delete de empresa no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }

  @Patch(':id/state/:state')
  @ApiOperation({ summary: 'Atualizar status da empresa no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiParam({ name: 'state', description: 'Status da empresa', enum: CompanyStatus })
  updateCompanyState(@Param('id') id: string, @Param('state') state: CompanyStatus) {
    return this.companiesService.updateCompanyState(id, state);
  }

  @Get(':id/users')
  @ApiOperation({ summary: 'Listar usuários vinculados à empresa no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  listCompanyUsers(@Param('id') id: string) {
    return this.companiesService.listCompanyUsers(id);
  }

  @Post(':id/customers/validate-whatsapp')
  @ApiOperation({ summary: 'Enfileirar revalidação de WhatsApp dos clientes da empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Validação de WhatsApp enfileirada com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async validateWhatsappForCompany(@Param('id') id: string) {
    await this.companiesService.findOne(id);
    return this.customersService.enqueueWhatsappValidationForCompany(id);
  }

  @Post(':id/rfv/reprocess')
  @ApiOperation({ summary: 'Reprocessar análise RFV de todos os clientes da empresa' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiResponse({ status: 200, description: 'Reprocessamento RFV enfileirado com sucesso' })
  @ApiResponse({ status: 404, description: 'Empresa não encontrada' })
  async reprocessRfvForCompany(@Param('id') id: string) {
    await this.companiesService.findOne(id);
    await this.rfvEngineService.calculateForCompany(id);
    return {
      message: 'Reprocessamento de toda a base RFV enfileirado com sucesso',
      companyId: id,
    };
  }

  @Get(':id/coupons')
  @ApiOperation({ summary: 'Listar cupons disponíveis da empresa no admin' })
  @ApiParam({ name: 'id', description: 'ID da empresa' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiQuery({ name: 'orderBy', required: false, type: String })
  @ApiQuery({ name: 'orderDirection', required: false, type: String })
  @ApiQuery({ name: 'search', required: false, type: String })
  @ApiQuery({ name: 'active', required: false, type: Boolean })
  @ApiQuery({ name: 'onlyValid', required: false, type: Boolean })
  listCompanyCoupons(
    @Param('id') id: string,
    @Query() paginationDto: PaginationDto,
    @Query() filterDto: CouponFilterDto,
  ) {
    return this.couponsService.findAll(id, paginationDto, {
      ...filterDto,
      active: filterDto.active ?? true,
      onlyValid: filterDto.onlyValid ?? true,
    });
  }
}
