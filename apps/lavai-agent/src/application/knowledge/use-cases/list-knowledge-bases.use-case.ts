import { Inject, Injectable } from '@nestjs/common';
import {
  KNOWLEDGE_BASE_REPOSITORY,
  KnowledgeBaseData,
} from '../ports/knowledge-base.repository.port';
import type { KnowledgeBaseRepositoryPort } from '../ports/knowledge-base.repository.port';

@Injectable()
export class ListKnowledgeBasesUseCase {
  constructor(
    @Inject(KNOWLEDGE_BASE_REPOSITORY)
    private readonly repo: KnowledgeBaseRepositoryPort,
  ) {}

  async execute(companyId: string): Promise<KnowledgeBaseData[]> {
    return this.repo.findByCompany(companyId);
  }
}
