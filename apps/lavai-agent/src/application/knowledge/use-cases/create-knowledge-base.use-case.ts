import { Inject, Injectable } from '@nestjs/common';
import {
  KNOWLEDGE_BASE_REPOSITORY,
  KnowledgeBaseData,
  CreateKnowledgeBaseInput,
} from '../ports/knowledge-base.repository.port';
import type { KnowledgeBaseRepositoryPort } from '../ports/knowledge-base.repository.port';

@Injectable()
export class CreateKnowledgeBaseUseCase {
  constructor(
    @Inject(KNOWLEDGE_BASE_REPOSITORY)
    private readonly repo: KnowledgeBaseRepositoryPort,
  ) {}

  async execute(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseData> {
    return this.repo.create(input);
  }
}
