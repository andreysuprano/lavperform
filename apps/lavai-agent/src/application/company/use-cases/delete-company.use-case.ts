import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { COMPANY_REPOSITORY } from '../ports/company.repository.port';
import type { CompanyRepositoryPort } from '../ports/company.repository.port';

@Injectable()
export class DeleteCompanyUseCase {
  constructor(
    @Inject(COMPANY_REPOSITORY)
    private readonly repository: CompanyRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    const existing = await this.repository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Company com id "${id}" não encontrada.`);
    }
    await this.repository.delete(id);
  }
}
