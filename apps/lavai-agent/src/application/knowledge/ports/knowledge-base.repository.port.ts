export const KNOWLEDGE_BASE_REPOSITORY = Symbol('KNOWLEDGE_BASE_REPOSITORY');

export interface KnowledgeBaseData {
  id: string;
  companyId: string;
  agentId: string | null;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateKnowledgeBaseInput {
  companyId: string;
  agentId?: string;
  name: string;
  description?: string;
}

export interface KnowledgeBaseRepositoryPort {
  create(input: CreateKnowledgeBaseInput): Promise<KnowledgeBaseData>;
  findById(id: string): Promise<KnowledgeBaseData | null>;
  findByCompany(companyId: string): Promise<KnowledgeBaseData[]>;
  delete(id: string): Promise<void>;
}
