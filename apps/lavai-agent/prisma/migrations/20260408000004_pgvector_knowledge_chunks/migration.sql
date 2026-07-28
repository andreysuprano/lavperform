-- Migration manual: habilita pgvector e adiciona coluna de embedding em knowledge_chunks
-- Execute APÓS rodar `prisma migrate` que cria a tabela knowledge_chunks sem a coluna embedding.

-- 1. Habilitar extensão pgvector (requer superuser no Postgres)
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Adicionar coluna embedding (1536 dimensões = text-embedding-3-small)
ALTER TABLE knowledge_chunks ADD COLUMN IF NOT EXISTS embedding vector(1536);

-- 3. Índice HNSW para busca por similaridade de cosseno (alta performance)
CREATE INDEX IF NOT EXISTS knowledge_chunks_embedding_hnsw_idx
  ON knowledge_chunks
  USING hnsw (embedding vector_cosine_ops);
