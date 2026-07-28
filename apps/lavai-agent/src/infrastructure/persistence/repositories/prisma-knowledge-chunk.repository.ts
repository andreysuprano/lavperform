import { Injectable, Logger } from '@nestjs/common';
import type {
  CreateChunkInput,
  KnowledgeChunkData,
  KnowledgeChunkRepositoryPort,
  KnowledgeChunkWithScore,
} from '../../../application/knowledge/ports/knowledge-chunk.repository.port';
import { PrismaService } from '../prisma/prisma.service';

type RawChunkRow = {
  id: string;
  knowledge_base_id: string;
  company_id: string;
  content: string;
  metadata: unknown;
  embedding_model: string;
  created_at: Date;
};

type RawChunkWithScore = RawChunkRow & { score: number };

@Injectable()
export class PrismaKnowledgeChunkRepository implements KnowledgeChunkRepositoryPort {
  private readonly logger = new Logger(PrismaKnowledgeChunkRepository.name);

  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateChunkInput): Promise<KnowledgeChunkData> {
    const embeddingLiteral = `[${input.embedding.join(',')}]`;

    const rows = await this.prisma.$queryRawUnsafe<RawChunkRow[]>(
      `INSERT INTO knowledge_chunks
         (id, knowledge_base_id, company_id, content, metadata, embedding_model, embedding, created_at)
       VALUES
         (gen_random_uuid(), $1, $2, $3, $4::jsonb, 'text-embedding-3-small', $5::vector, NOW())
       RETURNING id, knowledge_base_id, company_id, content, metadata, embedding_model, created_at`,
      input.knowledgeBaseId,
      input.companyId,
      input.content,
      JSON.stringify(input.metadata ?? {}),
      embeddingLiteral,
    );

    return this.map(rows[0]);
  }

  async searchSimilar(
    embedding: number[],
    companyId: string,
    topK: number,
    similarityThreshold: number,
  ): Promise<KnowledgeChunkWithScore[]> {
    const embeddingLiteral = `[${embedding.join(',')}]`;

    const rows = await this.prisma.$queryRawUnsafe<RawChunkWithScore[]>(
      `SELECT
         id, knowledge_base_id, company_id, content, metadata, embedding_model, created_at,
         1 - (embedding <=> $1::vector) AS score
       FROM knowledge_chunks
       WHERE company_id = $2
         AND 1 - (embedding <=> $1::vector) >= $3
       ORDER BY embedding <=> $1::vector
       LIMIT $4`,
      embeddingLiteral,
      companyId,
      similarityThreshold,
      topK,
    );

    return rows.map((row) => ({
      ...this.map(row),
      score: Number(row.score),
    }));
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.$queryRawUnsafe(
      'DELETE FROM knowledge_chunks WHERE id = $1',
      id,
    );
  }

  private map(row: RawChunkRow): KnowledgeChunkData {
    return {
      id: row.id,
      knowledgeBaseId: row.knowledge_base_id,
      companyId: row.company_id,
      content: row.content,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
      embeddingModel: row.embedding_model,
      createdAt: row.created_at,
    };
  }
}
