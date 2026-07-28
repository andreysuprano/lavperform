import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyData,
  CreateCompanyData,
} from '../ports/company.repository.port';
import type { CompanyRepositoryPort } from '../ports/company.repository.port';

@Injectable()
export class CreateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
  ) {}

  async execute(data: CreateCompanyData): Promise<CompanyData> {
    return this.repository.create(data);
  }
}
