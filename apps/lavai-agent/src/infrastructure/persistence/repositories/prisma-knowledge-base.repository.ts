import { Injectable } from '@nestjs/common';
import type {
  KnowledgeBaseData,
  KnowledgeBaseRepositoryPort,
  CreateKnowledgeBaseInput,
} from '../../../application/knowledge/ports/knowledge-base.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaKnowledgeBaseRepository implements KnowledgeBaseRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseData> {
    const row = await this.prisma.knowledgeBase.create({
      data: {
        companyId: input.companyId,
        agentId: input.agentId ?? null,
        name: input.name,
        description: input.description ?? null,
      },
    });
    return this.map(row);
  }

  async findById(id: string): Promise<KnowledgeBaseData | null> {
    const row = await this.prisma.knowledgeBase.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByCompany(companyId: string): Promise<KnowledgeBaseData[]> {
    const rows = await this.prisma.knowledgeBase.findMany({
      where: { companyId, active: true },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map((r) => this.map(r));
  }

  async delete(id: string): Promise<void> {
    await this.prisma.knowledgeBase.delete({ where: { id } });
  }

  private map(row: {
    id: string;
    companyId: string;
    agentId: string | null;
    name: string;
    description: string | null;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): KnowledgeBaseData {
    return {
      id: row.id,
      companyId: row.companyId,
      agentId: row.agentId,
      name: row.name,
      description: row.description,
      active: row.active,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }
}
