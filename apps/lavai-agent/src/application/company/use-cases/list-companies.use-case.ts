import { Inject, Injectable } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyData,
} from '../ports/company.repository.port';
import type { CompanyRepositoryPort } from '../ports/company.repository.port';

@Injectable()
export class ListCompaniesUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
  ) {}

  async execute(): Promise<CompanyData[]> {
    return this.repository.findAll();
  }
}
