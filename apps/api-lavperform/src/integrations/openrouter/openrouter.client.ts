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
  OPENROUTER_MODELS_URL,
  extractImageDataUrl,
  extractTextContent,
  type OpenRouterContent,
  type OpenRouterMessage,
} from './openrouter.types';

export type ImageRole = 'logo' | 'media' | 'reference';

export interface PromptImage {
  url: string;
  role?: ImageRole;
}

export interface GenerateImageOptions {
  compose?: boolean;
}

/**
 * Único cliente de IA da geração de posts.
 * Texto e imagem passam só pela API do OpenRouter (https://openrouter.ai).
 */
@Injectable()
export class OpenRouterClient {
  private capabilityCache = new Map<
    string,
    { at: number; value: { accepts: boolean; suggestion: string | null } }
  >();

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

  async generateImage(
    prompt: string,
    referenceImages: Array<string | PromptImage> = [],
    model?: string,
    options?: GenerateImageOptions,
  ): Promise<string> {
    try {
      return await this.requestImage(prompt, referenceImages, model, options);
    } catch {
      return await this.requestImage(prompt, referenceImages, model, options);
    }
  }

  async referenceCapability(modelId?: string): Promise<{
    accepts: boolean;
    suggestion: string | null;
  }> {
    const model = modelId?.trim() || (await this.imageModel());
    const cached = this.capabilityCache.get(model);
    if (cached && Date.now() - cached.at < 300_000) return cached.value;
    const apiKey = process.env.OPENROUTER_API_KEY?.trim();
    if (!apiKey) return { accepts: true, suggestion: null };
    try {
      const response = await fetch(OPENROUTER_MODELS_URL, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (!response.ok) return { accepts: true, suggestion: null };
      const payload = (await response.json()) as {
        data?: Array<{
          id?: string;
          architecture?: {
            input_modalities?: string[];
            output_modalities?: string[];
          };
        }>;
      };
      const models = payload.data ?? [];
      const current = models.find((item) => item.id === model);
      const accepts = current
        ? (current.architecture?.input_modalities ?? []).includes('image')
        : true;
      const suggestion =
        models.find(
          (item) =>
            item.id &&
            item.id !== model &&
            item.architecture?.input_modalities?.includes('image') &&
            item.architecture?.output_modalities?.includes('image'),
        )?.id ?? null;
      const value = { accepts, suggestion };
      this.capabilityCache.set(model, { at: Date.now(), value });
      return value;
    } catch {
      return { accepts: true, suggestion: null };
    }
  }

  private async requestImage(
    prompt: string,
    referenceImages: Array<string | PromptImage>,
    model?: string,
    options?: GenerateImageOptions,
  ): Promise<string> {
    const images = referenceImages.map((item) =>
      typeof item === 'string'
        ? { url: item, role: 'reference' as const }
        : item,
    );
    const content: OpenRouterContent = images.length
      ? [
          {
            type: 'text',
            text: options?.compose
              ? `${prompt}\n\n${this.composeNotes(images)}`
              : `${prompt} Use the attached images only as inspiration for style and composition. Do not reproduce any text from them. The result must contain no text, letters, numbers, logo or watermark.`,
          },
          ...images.map((image) => ({
            type: 'image_url' as const,
            image_url: { url: image.url },
          })),
        ]
      : prompt;
    const payload = await this.post({
      model: model?.trim() || (await this.imageModel()),
      messages: [{ role: 'user', content }],
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

  private composeNotes(images: Array<{ role?: ImageRole }>): string {
    return images
      .map((image, index) => {
        const number = index + 1;
        if (image.role === 'logo') {
          return `Image ${number} is the brand logo. Place this exact logo in the artwork.`;
        }
        if (image.role === 'media') {
          return `Image ${number} is a store photo. The final post MUST show this photo, composited into the layout. Do not treat it as style inspiration.`;
        }
        return `Image ${number} is style inspiration only. Do not copy its text.`;
      })
      .join(' ');
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
