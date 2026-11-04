import {
  BadGatewayException,
  Injectable,
  Optional,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiModelSettingsService } from './ai-model-settings.service';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
  OPENROUTER_CHAT_URL,
  extractImageDataUrl,
  extractTextContent,
  type OpenRouterMessage,
} from './openrouter.types';

/**
 * Único cliente de IA da geração de posts.
 * Texto e imagem passam só pela API do OpenRouter (https://openrouter.ai).
 */
@Injectable()
export class OpenRouterClient {
  constructor(
    @Optional() private readonly modelSettings?: AiModelSettingsService,
  ) {}

  async textModel(): Promise<string> {
    if (this.modelSettings) {
      return (await this.modelSettings.resolveTextModel()).model;
    }
    return process.env.OPENROUTER_TEXT_MODEL?.trim() || DEFAULT_TEXT_MODEL;
  }

  async imageModel(): Promise<string> {
    if (this.modelSettings) {
      return (await this.modelSettings.resolveImageModel()).model;
    }
    return process.env.OPENROUTER_IMAGE_MODEL?.trim() || DEFAULT_IMAGE_MODEL;
  }

  async completeText(messages: OpenRouterMessage[]): Promise<string> {
    const payload = await this.post({
      model: await this.textModel(),
      temperature: 0.7,
      messages,
    });
    const text = extractTextContent(payload).trim();
    if (!text) {
      throw new BadGatewayException(
        'OpenRouter não devolveu texto para a legenda',
      );
    }
    return text;
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      return await this.requestImage(prompt);
    } catch {
      return await this.requestImage(prompt);
    }
  }

  private async requestImage(prompt: string): Promise<string> {
    const payload = await this.post({
      model: await this.imageModel(),
      messages: [{ role: 'user', content: prompt }],
      modalities: ['image', 'text'],
    });
    const image = extractImageDataUrl(payload);
    if (!image) {
      throw new BadGatewayException(
        'OpenRouter não devolveu a imagem de fundo',
      );
    }
    return image;
  }

  private async post(body: Record<string, unknown>): Promise<unknown> {
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'OPENROUTER_API_KEY não configurada',
      );
    }

    const timeoutMs = Number(process.env.OPENROUTER_TIMEOUT_MS || 90_000);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(OPENROUTER_CHAT_URL, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer':
            process.env.OPENROUTER_HTTP_REFERER?.trim() ||
            'https://lavperform.com',
          'X-Title': 'LavPerform',
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError');
      if (aborted) {
        throw new BadGatewayException(
          'A OpenRouter demorou demais para responder. Tente de novo.',
        );
      }
      const detail = error instanceof Error ? error.message : 'falha de rede';
      throw new BadGatewayException(`Falha ao chamar o OpenRouter: ${detail}`);
    } finally {
      clearTimeout(timer);
    }

    if (!response.ok) {
      const detail = (await response.text()).slice(0, 400);
      throw new BadGatewayException(
        `OpenRouter respondeu ${response.status}: ${detail}`,
      );
    }

    return response.json();
  }
}
