import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { KNOWLEDGE_BASE_REPOSITORY } from '../../application/knowledge/ports/knowledge-base.repository.port';
import { KNOWLEDGE_CHUNK_REPOSITORY } from '../../application/knowledge/ports/knowledge-chunk.repository.port';
import { EMBEDDING_PORT } from '../../application/knowledge/ports/embedding.port';
import { CreateKnowledgeBaseUseCase } from '../../application/knowledge/use-cases/create-knowledge-base.use-case';
import { DeleteKnowledgeChunkUseCase } from '../../application/knowledge/use-cases/delete-knowledge-chunk.use-case';
import { IngestContentUseCase } from '../../application/knowledge/use-cases/ingest-content.use-case';
import { ListKnowledgeBasesUseCase } from '../../application/knowledge/use-cases/list-knowledge-bases.use-case';
import { KnowledgeController } from '../../infrastructure/http/knowledge/knowledge.controller';
import { KnowledgeEmbeddingProcessor } from '../../infrastructure/queue/knowledge-embedding.processor';
import { PrismaKnowledgeBaseRepository } from '../../infrastructure/persistence/repositories/prisma-knowledge-base.repository';
import { PrismaKnowledgeChunkRepository } from '../../infrastructure/persistence/repositories/prisma-knowledge-chunk.repository';
import { OpenAiEmbeddingService } from '../../infrastructure/providers/openai/openai-embedding.service';
import { KNOWLEDGE_INGEST_QUEUE_NAME } from '../../infrastructure/queue/knowledge-queue.constants';
import { BullSetupModule } from '../messaging/bull.setup.module';

@Module({
  imports: [
    BullSetupModule,
    BullModule.registerQueue({ name: KNOWLEDGE_INGEST_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: KNOWLEDGE_INGEST_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
  ],
  controllers: [KnowledgeController],
  providers: [
    PrismaKnowledgeBaseRepository,
    { provide: KNOWLEDGE_BASE_REPOSITORY, useExisting: PrismaKnowledgeBaseRepository },

    PrismaKnowledgeChunkRepository,
    { provide: KNOWLEDGE_CHUNK_REPOSITORY, useExisting: PrismaKnowledgeChunkRepository },

    OpenAiEmbeddingService,
    { provide: EMBEDDING_PORT, useExisting: OpenAiEmbeddingService },

    KnowledgeEmbeddingProcessor,

    CreateKnowledgeBaseUseCase,
    ListKnowledgeBasesUseCase,
    IngestContentUseCase,
    DeleteKnowledgeChunkUseCase,
  ],
  exports: [KNOWLEDGE_CHUNK_REPOSITORY, EMBEDDING_PORT],
})
export class RagModule {}
