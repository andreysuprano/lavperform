import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import {
  COMPANY_REPOSITORY,
  CompanyData,
  UpdateCompanyData,
} from '../ports/company.repository.port';
import type { CompanyRepositoryPort } from '../ports/company.repository.port';

@Injectable()
export class UpdateCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
  ) {}

  async execute(id: string, data: UpdateCompanyData): Promise<CompanyData> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Company com id "${id}" não encontrada.`);
    }
    return this.repository.update(id, data);
  }
}
