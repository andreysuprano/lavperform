import { Inject, Injectable } from '@nestjs/common';
import { KNOWLEDGE_CHUNK_REPOSITORY } from '../ports/knowledge-chunk.repository.port';
import type { KnowledgeChunkRepositoryPort } from '../ports/knowledge-chunk.repository.port';

@Injectable()
export class DeleteKnowledgeChunkUseCase {
  constructor(
    @Inject(KNOWLEDGE_CHUNK_REPOSITORY)
    private readonly repo: KnowledgeChunkRepositoryPort,
  ) {}

  async execute(id: string): Promise<void> {
    return this.repo.deleteById(id);
  }
}
