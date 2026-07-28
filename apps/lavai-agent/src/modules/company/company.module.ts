import { Module } from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../../application/company/ports/company.repository.port';
import { CreateCompanyUseCase } from '../../application/company/use-cases/create-company.use-case';
import { DeleteCompanyUseCase } from '../../application/company/use-cases/delete-company.use-case';
import { FindCompanyByIdUseCase } from '../../application/company/use-cases/find-company-by-id.use-case';
import { ListCompaniesUseCase } from '../../application/company/use-cases/list-companies.use-case';
import { UpdateCompanyUseCase } from '../../application/company/use-cases/update-company.use-case';
import { CompanyController } from '../../infrastructure/http/company/company.controller';
import { PrismaCompanyRepository } from '../../infrastructure/persistence/repositories/prisma-company.repository';

@Module({
  controllers: [CompanyController],
  providers: [
    PrismaCompanyRepository,
    {
      provide: COMPANY_REPOSITORY,
      useExisting: PrismaCompanyRepository,
    },
    CreateCompanyUseCase,
    ListCompaniesUseCase,
    FindCompanyByIdUseCase,
    UpdateCompanyUseCase,
    DeleteCompanyUseCase,
  ],
  exports: [FindCompanyByIdUseCase],
})
export class CompanyModule {}
