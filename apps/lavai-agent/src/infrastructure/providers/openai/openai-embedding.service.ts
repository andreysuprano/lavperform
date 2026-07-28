import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type { EmbeddingPort } from '../../../application/knowledge/ports/embedding.port';

/**
 * Gera embeddings usando text-embedding-3-small da OpenAI (1536 dimensões).
 * Usa api.openai.com diretamente — separado do cliente OpenRouter.
 */
@Injectable()
export class OpenAiEmbeddingService implements EmbeddingPort {
  private readonly logger = new Logger(OpenAiEmbeddingService.name);
  private readonly client: OpenAI;
  private readonly model = 'text-embedding-3-small';

  constructor() {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY,
    });
  }

  async embed(text: string): Promise<number[]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: text,
    });
    return response.data[0].embedding;
  }

  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await this.client.embeddings.create({
      model: this.model,
      input: texts,
    });
    return response.data.map((d) => d.embedding);
  }
}
