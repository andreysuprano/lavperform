import { BadGatewayException, Inject, Injectable } from '@nestjs/common';
import { LLM_PROVIDER_PORT } from '../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../agent-runner/ports/llm-provider.port';
import { PromptBuilderService } from '../agent-runner/services/prompt-builder.service';
import type { KnowledgeChunkWithScore } from '../knowledge/ports/knowledge-chunk.repository.port';
import type { PromptDocument } from './prompt-studio.types';

const DEFAULT_MODEL = 'openai/gpt-5';

export interface TestPromptInput {
  document: PromptDocument;
  question: string;
  modelName?: string;
  ragChunks?: Array<{ content: string; score: number; id: string }>;
}

export interface TestPromptResult {
  answer: string;
}

@Injectable()
export class TestPromptUseCase {
  constructor(
    private readonly promptBuilder: PromptBuilderService,
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
  ) {}

  async execute(input: TestPromptInput): Promise<TestPromptResult> {
    const messages = this.promptBuilder.build(
      {
        persona: input.document,
        modelConfig: { maxTokens: 1024 },
      } as never,
      [],
      this.toKnowledgeChunks(input.ragChunks ?? []),
      input.question,
    );

    const response = await this.llm.complete({
      model: input.modelName ?? DEFAULT_MODEL,
      messages,
    });

    if (!response.content) {
      throw new BadGatewayException();
    }

    return { answer: response.content };
  }

  private toKnowledgeChunks(
    chunks: Array<{ content: string; score: number; id: string }>,
  ): KnowledgeChunkWithScore[] {
    return chunks.map((chunk) => ({
      id: chunk.id,
      content: chunk.content,
      score: chunk.score,
      knowledgeBaseId: '',
      companyId: '',
      metadata: {},
      embeddingModel: '',
      createdAt: new Date(0),
    }));
  }
}
