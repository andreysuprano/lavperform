import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import type {
  LlmCompletionRequest,
  LlmCompletionResponse,
  LlmProviderPort,
  LlmToolCall,
} from '../../../application/agent-runner/ports/llm-provider.port';

export interface OpenRouterModel {
  /** Slug usado como modelName (ex: "openai/gpt-4o") */
  id: string;
  /** Nome legível para exibição no frontend */
  name: string;
  description: string;
  contextLength: number;
  pricing: {
    /** USD por token de prompt */
    prompt: string;
    /** USD por token de completion */
    completion: string;
  };
}

/**
 * Implementa LlmProviderPort via OpenRouter — compatível com a API OpenAI.
 * O slug do modelo (AgentModelConfig.modelName) é passado diretamente
 * para o OpenRouter (ex: "openai/gpt-4o", "anthropic/claude-3-5-sonnet").
 */
@Injectable()
export class OpenRouterLlmService implements LlmProviderPort {
  private readonly logger = new Logger(OpenRouterLlmService.name);
  private readonly client: OpenAI;
  private readonly baseUrl: string;
  private readonly apiKey: string;

  constructor() {
    this.baseUrl =
      process.env.OPENROUTER_BASE_URL ?? 'https://openrouter.ai/api/v1';
    this.apiKey = process.env.OPENROUTER_API_KEY ?? '';

    this.client = new OpenAI({
      baseURL: this.baseUrl,
      apiKey: this.apiKey,
      defaultHeaders: {
        'HTTP-Referer':
          process.env.OPENROUTER_APP_URL ?? 'https://lavperform.com',
        'X-Title': process.env.OPENROUTER_APP_NAME ?? 'lavai-agent',
      },
    });
  }

  async complete(request: LlmCompletionRequest): Promise<LlmCompletionResponse> {
    this.logger.log(
      `[LLM] Chamando OpenRouter | model=${request.model} | messages=${request.messages.length} | tools=${request.tools?.length ?? 0}`,
    );

    const response = await this.client.chat.completions.create({
      model: request.model,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: request.messages as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      tools: request.tools as any,
      temperature: request.temperature,
      max_tokens: request.maxTokens,
      top_p: request.topP,
      frequency_penalty: request.frequencyPenalty,
      presence_penalty: request.presencePenalty,
    });

    const choice = response.choices[0];
    const message = choice?.message;

    const toolCalls: LlmToolCall[] = (message?.tool_calls ?? [])
      .filter((tc) => tc.type === 'function')
      .map((tc) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const fn = (tc as any).function as { name: string; arguments: string };
        return {
          id: tc.id,
          type: 'function' as const,
          function: { name: fn.name, arguments: fn.arguments },
        };
      });

    const usage = response.usage;
    this.logger.log(
      `[LLM] Resposta recebida | model=${request.model} | finishReason=${choice?.finish_reason ?? '-'} | toolCalls=${toolCalls.length} | promptTokens=${usage?.prompt_tokens ?? '-'} | completionTokens=${usage?.completion_tokens ?? '-'}`,
    );

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const content = this.extractContent((message as any)?.content);

    if (content) {
      this.logger.debug(
        `[LLM] Conteúdo da resposta: "${content.slice(0, 200)}${content.length > 200 ? '...' : ''}"`,
      );
    }

    if (toolCalls.length > 0) {
      this.logger.debug(
        `[LLM] Tool calls: ${toolCalls.map((tc) => `${tc.function.name}(${tc.function.arguments.slice(0, 100)})`).join(' | ')}`,
      );
    }

    return {
      content,
      toolCalls,
      finishReason: choice?.finish_reason ?? 'stop',
    };
  }

  /**
   * Normaliza o campo `content` da resposta do LLM para string simples.
   *
   * Alguns modelos via OpenRouter retornam o conteúdo como array de partes
   * (formato multimodal da API OpenAI) ou como string serializada no padrão
   * Python/JSON — ex: [{'type': 'text', 'text': '...'}].
   * Este método extrai o texto puro em qualquer um desses casos.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private extractContent(raw: any): string | null {
    if (raw === null || raw === undefined) return null;

    // Caso 1: array de partes (multimodal nativo da API)
    if (Array.isArray(raw)) {
      const text = raw
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .filter((part: any) => part?.type === 'text' && typeof part?.text === 'string')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .map((part: any) => part.text as string)
        .join('\n');
      return text || null;
    }

    // Caso 2: string normal
    if (typeof raw !== 'string') return String(raw) || null;

    const trimmed = raw.trim();

    // Caso 3: string que parece array serializado ([{...}]) — padrão Python ou JSON
    if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
      const extracted = this.tryExtractFromArrayString(trimmed);
      if (extracted !== null) {
        this.logger.warn(
          '[LLM] Conteúdo recebido em formato array-string; texto extraído automaticamente.',
        );
        return extracted;
      }
    }

    return raw;
  }

  /**
   * Tenta fazer parse de uma string no formato `[{'type':'text','text':'...'}]`
   * (com aspas simples estilo Python ou aspas duplas estilo JSON).
   * Retorna o texto concatenado ou null se não reconhecer o formato.
   */
  private tryExtractFromArrayString(value: string): string | null {
    const attempts = [
      value,
      // converte aspas simples → duplas para tentar parse JSON
      value.replace(/'/g, '"').replace(/True/g, 'true').replace(/False/g, 'false').replace(/None/g, 'null'),
    ];

    for (const candidate of attempts) {
      try {
        const parsed: unknown = JSON.parse(candidate);
        if (!Array.isArray(parsed)) continue;

        const texts = (parsed as Array<unknown>)
          .filter(
            (p): p is { type: string; text: string } =>
              typeof p === 'object' &&
              p !== null &&
              (p as Record<string, unknown>)['type'] === 'text' &&
              typeof (p as Record<string, unknown>)['text'] === 'string',
          )
          .map((p) => p.text);

        if (texts.length > 0) return texts.join('\n');
      } catch {
        // continua para a próxima tentativa
      }
    }

    return null;
  }

  /**
   * Lista os modelos disponíveis no OpenRouter.
   * O frontend usa este endpoint para popular o select de modelo no agente.
   */
  async listModels(): Promise<OpenRouterModel[]> {
    const url = `${this.baseUrl}/models`;

    this.logger.debug('[LLM] Buscando lista de modelos no OpenRouter');

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
      },
    });

    if (!response.ok) {
      const body = await response.text();
      this.logger.error(
        `[LLM] Falha ao listar modelos: HTTP ${response.status} — ${body}`,
      );
      throw new Error(`Falha ao listar modelos do OpenRouter: ${response.status}`);
    }

    const json = (await response.json()) as {
      data: Array<{
        id: string;
        name: string;
        description?: string;
        context_length?: number;
        pricing?: { prompt?: string; completion?: string };
      }>;
    };

    return json.data.map((m) => ({
      id: m.id,
      name: m.name,
      description: m.description ?? '',
      contextLength: m.context_length ?? 0,
      pricing: {
        prompt: m.pricing?.prompt ?? '0',
        completion: m.pricing?.completion ?? '0',
      },
    }));
  }
}
