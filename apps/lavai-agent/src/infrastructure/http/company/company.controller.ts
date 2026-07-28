import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
} from '@nestjs/common';
import {
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { CreateCompanyDto } from '../../../application/company/dtos/create-company.dto';
import { UpdateCompanyDto } from '../../../application/company/dtos/update-company.dto';
import { CompanyData } from '../../../application/company/ports/company.repository.port';
import { CreateCompanyUseCase } from '../../../application/company/use-cases/create-company.use-case';
import { DeleteCompanyUseCase } from '../../../application/company/use-cases/delete-company.use-case';
import { FindCompanyByIdUseCase } from '../../../application/company/use-cases/find-company-by-id.use-case';
import { ListCompaniesUseCase } from '../../../application/company/use-cases/list-companies.use-case';
import { UpdateCompanyUseCase } from '../../../application/company/use-cases/update-company.use-case';

@ApiTags('companies')
@Controller('companies')
export class CompanyController {
  constructor(
    private readonly createCompany: CreateCompanyUseCase,
    private readonly listCompanies: ListCompaniesUseCase,
    private readonly findCompanyById: FindCompanyByIdUseCase,
    private readonly updateCompany: UpdateCompanyUseCase,
    private readonly deleteCompany: DeleteCompanyUseCase,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar uma nova empresa' })
  create(@Body() dto: CreateCompanyDto): Promise<CompanyData> {
    return this.createCompany.execute(dto);
  }

  @Get()
  @ApiOperation({ summary: 'Listar todas as empresas' })
  findAll(): Promise<CompanyData[]> {
    return this.listCompanies.execute();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Buscar empresa por UUID' })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada' })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<CompanyData> {
    return this.findCompanyById.execute(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Atualizar dados da empresa' })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada' })
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCompanyDto,
  ): Promise<CompanyData> {
    return this.updateCompany.execute(id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remover empresa' })
  @ApiNoContentResponse({ description: 'Empresa removida com sucesso' })
  @ApiNotFoundResponse({ description: 'Empresa não encontrada' })
  async remove(@Param('id', ParseUUIDPipe) id: string): Promise<void> {
    await this.deleteCompany.execute(id);
  }
}
