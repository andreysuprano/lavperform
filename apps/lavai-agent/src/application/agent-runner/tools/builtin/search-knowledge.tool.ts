import { Inject, Injectable } from '@nestjs/common';
import type { AgentTool, ToolExecutionContext } from '../tool.interface';
import {
  KNOWLEDGE_CHUNK_REPOSITORY,
} from '../../../knowledge/ports/knowledge-chunk.repository.port';
import type { KnowledgeChunkRepositoryPort } from '../../../knowledge/ports/knowledge-chunk.repository.port';
import { EMBEDDING_PORT } from '../../../knowledge/ports/embedding.port';
import type { EmbeddingPort } from '../../../knowledge/ports/embedding.port';

interface SearchInput {
  query: string;
}

@Injectable()
export class SearchKnowledgeTool implements AgentTool {
  readonly name = 'search_knowledge';
  readonly description =
    'Busca informações relevantes na base de conhecimento da empresa. Use quando precisar de informações específicas do negócio.';
  readonly inputSchema = {
    type: 'object',
    properties: {
      query: {
        type: 'string',
        description: 'A consulta para buscar na base de conhecimento',
      },
    },
    required: ['query'],
  };

  constructor(
    @Inject(KNOWLEDGE_CHUNK_REPOSITORY)
    private readonly chunkRepo: KnowledgeChunkRepositoryPort,
    @Inject(EMBEDDING_PORT)
    private readonly embedding: EmbeddingPort,
  ) {}

  async execute(input: unknown, context: ToolExecutionContext): Promise<unknown> {
    const { query } = input as SearchInput;
    const topK = parseInt(process.env.AGENT_RAG_TOP_K ?? '5', 10);
    const threshold = parseFloat(
      process.env.AGENT_RAG_SIMILARITY_THRESHOLD ?? '0.7',
    );

    const vector = await this.embedding.embed(query);
    const chunks = await this.chunkRepo.searchSimilar(
      vector,
      context.companyId,
      topK,
      threshold,
    );

    if (chunks.length === 0) {
      return { results: [], message: 'Nenhuma informação relevante encontrada.' };
    }

    return {
      results: chunks.map((c) => ({ content: c.content, score: c.score })),
    };
  }
}
