import { Injectable } from '@nestjs/common';
import {
  CompanyData,
  CompanyRepositoryPort,
  CreateCompanyData,
  UpdateCompanyData,
} from '../../../application/company/ports/company.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaCompanyRepository implements CompanyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(data: CreateCompanyData): Promise<CompanyData> {
    return this.prisma.company.create({ data });
  }

  async findById(id: string): Promise<CompanyData | null> {
    return this.prisma.company.findUnique({ where: { id } });
  }

  async findAll(): Promise<CompanyData[]> {
    return this.prisma.company.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async update(id: string, data: UpdateCompanyData): Promise<CompanyData> {
    return this.prisma.company.update({ where: { id }, data });
  }

  async delete(id: string): Promise<void> {
    await this.prisma.company.delete({ where: { id } });
  }
}
