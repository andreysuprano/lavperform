import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { KNOWLEDGE_BASE_REPOSITORY } from '../ports/knowledge-base.repository.port';
import type { KnowledgeBaseRepositoryPort } from '../ports/knowledge-base.repository.port';
import { KNOWLEDGE_INGEST_QUEUE_NAME } from '../../../infrastructure/queue/knowledge-queue.constants';

export interface IngestContentInput {
  knowledgeBaseId: string;
  companyId: string;
  content: string;
  metadata?: Record<string, unknown>;
}

export interface IngestContentResult {
  jobsEnqueued: number;
}

@Injectable()
export class IngestContentUseCase {
  private readonly logger = new Logger(IngestContentUseCase.name);

  constructor(
    @Inject(KNOWLEDGE_BASE_REPOSITORY)
    private readonly kbRepo: KnowledgeBaseRepositoryPort,
    @InjectQueue(KNOWLEDGE_INGEST_QUEUE_NAME)
    private readonly queue: Queue,
  ) {}

  async execute(input: IngestContentInput): Promise<IngestContentResult> {
    const kb = await this.kbRepo.findById(input.knowledgeBaseId);
    if (!kb) {
      throw new NotFoundException(
        `Base de conhecimento não encontrada: ${input.knowledgeBaseId}`,
      );
    }

    const chunks = this.chunkText(input.content, 2000, 200);
    this.logger.log(
      `[Ingest] ${chunks.length} chunks para kb=${input.knowledgeBaseId}`,
    );

    await Promise.all(
      chunks.map((chunk, i) =>
        this.queue.add('embed-chunk', {
          knowledgeBaseId: input.knowledgeBaseId,
          companyId: input.companyId,
          content: chunk,
          metadata: {
            ...(input.metadata ?? {}),
            chunkIndex: i,
            totalChunks: chunks.length,
          },
        }),
      ),
    );

    return { jobsEnqueued: chunks.length };
  }

  /** Divide texto em chunks com overlap para preservar contexto entre chunks. */
  private chunkText(text: string, chunkSize: number, overlap: number): string[] {
    const chunks: string[] = [];
    let start = 0;

    while (start < text.length) {
      const end = Math.min(start + chunkSize, text.length);
      chunks.push(text.slice(start, end));
      if (end === text.length) break;
      start += chunkSize - overlap;
    }

    return chunks;
  }
}
