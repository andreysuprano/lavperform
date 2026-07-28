import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyData,
} from '../ports/company.repository.port';
import type { CompanyRepositoryPort } from '../ports/company.repository.port';

@Injectable()
export class FindCompanyByIdUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
  ) {}

  async execute(id: string): Promise<CompanyData> {
    const company = await this.repository.findById(id);
    if (!company) {
      throw new NotFoundException(`Company com id "${id}" não encontrada.`);
    }
    return company;
  }
}
