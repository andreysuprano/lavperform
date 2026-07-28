export const KNOWLEDGE_CHUNK_REPOSITORY = Symbol('KNOWLEDGE_CHUNK_REPOSITORY');

export interface KnowledgeChunkData {
  id: string;
  knowledgeBaseId: string;
  companyId: string;
  content: string;
  metadata: Record<string, unknown>;
  embeddingModel: string;
  createdAt: Date;
}

export interface KnowledgeChunkWithScore extends KnowledgeChunkData {
  score: number;
}

export interface CreateChunkInput {
  knowledgeBaseId: string;
  companyId: string;
  content: string;
  metadata?: Record<string, unknown>;
  embedding: number[];
}

export interface KnowledgeChunkRepositoryPort {
  create(input: CreateChunkInput): Promise<KnowledgeChunkData>;

  /**
   * Busca os top-K chunks mais similares ao embedding fornecido.
   * Filtro obrigatório por companyId garante isolamento multi-tenant.
   */
  searchSimilar(
    embedding: number[],
    companyId: string,
    topK: number,
    similarityThreshold: number,
  ): Promise<KnowledgeChunkWithScore[]>;

  deleteById(id: string): Promise<void>;
}
