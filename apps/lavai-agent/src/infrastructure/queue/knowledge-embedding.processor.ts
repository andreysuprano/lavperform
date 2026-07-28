import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { KNOWLEDGE_INGEST_QUEUE_NAME } from './knowledge-queue.constants';
import {
  KNOWLEDGE_CHUNK_REPOSITORY,
} from '../../application/knowledge/ports/knowledge-chunk.repository.port';
import type { KnowledgeChunkRepositoryPort } from '../../application/knowledge/ports/knowledge-chunk.repository.port';
import { EMBEDDING_PORT } from '../../application/knowledge/ports/embedding.port';
import type { EmbeddingPort } from '../../application/knowledge/ports/embedding.port';

interface EmbedChunkJobData {
  knowledgeBaseId: string;
  companyId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

@Processor(KNOWLEDGE_INGEST_QUEUE_NAME)
@Injectable()
export class KnowledgeEmbeddingProcessor extends WorkerHost {
  private readonly logger = new Logger(KnowledgeEmbeddingProcessor.name);

  constructor(
    @Inject(KNOWLEDGE_CHUNK_REPOSITORY)
    private readonly chunkRepo: KnowledgeChunkRepositoryPort,
    @Inject(EMBEDDING_PORT)
    private readonly embedding: EmbeddingPort,
  ) {
    super();
  }

  async process(job: Job<EmbedChunkJobData>): Promise<void> {
    const { knowledgeBaseId, companyId, content, metadata } = job.data;

    this.logger.log(
      `[KnowledgeEmbed] job=${job.id} | kb=${knowledgeBaseId} | chars=${content.length}`,
    );

    try {
      const vector = await this.embedding.embed(content);

      await this.chunkRepo.create({
        knowledgeBaseId,
        companyId,
        content,
        metadata: metadata ?? {},
        embedding: vector,
      });

      this.logger.log(
        `[KnowledgeEmbed] Chunk salvo com sucesso (job=${job.id})`,
      );
    } catch (err) {
      this.logger.error(
        `[KnowledgeEmbed] Falha no job=${job.id} | kb=${knowledgeBaseId} | tentativa=${job.attemptsMade + 1}`,
        err instanceof Error ? err.stack : String(err),
      );
      throw err;
    }
  }
}
