import { Injectable } from '@nestjs/common';
import { buildFalRequest } from './fal.input';
import { FAL_QUEUE_ORIGIN, type FalCatalogModel } from './fal.catalog';
import type { PostFormat } from '../../social-posts/domain/social-post.types';

export type FalFailureReason =
  'missing_key' | 'invalid_key' | 'timeout' | 'discontinued' | 'error';

export class FalImageError extends Error {
  constructor(
    readonly reason: FalFailureReason,
    message: string,
  ) {
    super(message);
    this.name = 'FalImageError';
  }
}

type QueueDeps = {
  fetchImpl?: typeof fetch;
  sleep?: (ms: number) => Promise<void>;
  now?: () => number;
};

const ALLOWED_IMAGE_HOST =
  /(^|\.)fal\.(ai|media)$|(^|\.)fal\.run$|(^|\.)googleapis\.com$/;

export function redactSecrets(
  text: string,
  secrets: Array<string | undefined>,
): string {
  let output = text;
  for (const secret of secrets) {
    if (secret && secret.length >= 6) {
      output = output.split(secret).join('[redacted]');
    }
  }
  return output
    .replace(/Key\s+[^\s'"]+/gi, 'Key [redacted]')
    .replace(/Bearer\s+[^\s'"]+/gi, 'Bearer [redacted]')
    .slice(0, 400);
}

@Injectable()
export class FalQueueClient {
  constructor(private readonly deps: QueueDeps = {}) {}

  async generate(input: {
    model: Pick<
      FalCatalogModel,
      'endpointId' | 'sizeMode' | 'referenceEndpoint' | 'referenceField'
    >;
    prompt: string;
    format: PostFormat;
    apiKey: string | undefined;
    timeoutMs: number;
    pollMs: number;
    example?: boolean;
    referenceImages?: string[];
  }): Promise<{
    dataUrl: string;
    notice: string | null;
    referencesIgnored: boolean;
  }> {
    const apiKey = input.apiKey?.trim() ?? '';
    if (!apiKey) {
      throw new FalImageError(
        'missing_key',
        'A chave do fal não está configurada.',
      );
    }
    const plan = buildFalRequest(input.model, input.prompt, input.format, {
      example: input.example,
      referenceImages: input.referenceImages,
    });
    const submitUrl = `${FAL_QUEUE_ORIGIN}/${plan.endpointId}`;
    const submitted = await this.request(submitUrl, {
      method: 'POST',
      apiKey,
      body: plan.body,
    });
    const handle = readQueueHandle(submitted.payload);
    if (!handle) {
      throw new FalImageError(
        'error',
        'O fal não devolveu o identificador da fila.',
      );
    }
    const deadline = this.now() + input.timeoutMs;
    let status = '';
    while (this.now() < deadline) {
      const polled = await this.request(handle.statusUrl, {
        method: 'GET',
        apiKey,
      });
      status = readStatus(polled.payload);
      if (status === 'COMPLETED') break;
      if (status === 'FAILED' || status === 'ERROR' || status === 'CANCELLED') {
        await this.cancel(handle.cancelUrl, apiKey);
        throw new FalImageError('error', 'O fal marcou o pedido como falha.');
      }
      await this.sleep(input.pollMs);
    }
    if (status !== 'COMPLETED') {
      await this.cancel(handle.cancelUrl, apiKey);
      throw new FalImageError('timeout', 'O fal excedeu o tempo limite.');
    }
    const result = await this.request(handle.responseUrl, {
      method: 'GET',
      apiKey,
    });
    const imageUrl = readImageUrl(result.payload);
    if (!imageUrl) {
      throw new FalImageError('error', 'O fal não devolveu a imagem.');
    }
    const dataUrl = imageUrl.startsWith('data:image/')
      ? imageUrl.replace(/\s/g, '')
      : await this.downloadImage(imageUrl);
    return {
      dataUrl,
      notice: plan.notice,
      referencesIgnored: plan.referencesIgnored,
    };
  }

  private async cancel(url: string, apiKey: string) {
    try {
      await this.request(url, { method: 'PUT', apiKey });
    } catch {
      return;
    }
  }

  private async downloadImage(url: string): Promise<string> {
    assertAllowedUrl(url, false);
    const response = await this.fetchImpl()(url, { method: 'GET' });
    if (!response.ok) {
      throw new FalImageError(
        'error',
        'Não foi possível baixar a imagem do fal.',
      );
    }
    const headerType = response.headers?.get?.('content-type') ?? '';
    const type = headerType.split(';')[0].trim().toLowerCase();
    if (type && !type.startsWith('image/')) {
      throw new FalImageError('error', 'O fal não devolveu uma imagem.');
    }
    const bytes = new Uint8Array(await response.arrayBuffer());
    const mime = type.startsWith('image/') ? type : 'image/png';
    return `data:${mime};base64,${Buffer.from(bytes).toString('base64')}`;
  }

  private async request(
    url: string,
    input: { method: string; apiKey: string; body?: Record<string, unknown> },
  ): Promise<{ status: number; payload: unknown }> {
    assertAllowedUrl(url, true);
    let response: Response;
    try {
      response = await this.fetchImpl()(url, {
        method: input.method,
        headers: {
          Authorization: `Key ${input.apiKey}`,
          Accept: 'application/json',
          ...(input.body ? { 'Content-Type': 'application/json' } : {}),
        },
        body: input.body ? JSON.stringify(input.body) : undefined,
      });
    } catch (error) {
      const aborted =
        error instanceof Error &&
        (error.name === 'AbortError' || error.name === 'TimeoutError');
      throw new FalImageError(
        aborted ? 'timeout' : 'error',
        aborted
          ? 'O fal excedeu o tempo limite.'
          : 'Falha de rede ao chamar o fal.',
      );
    }
    const text = await response.text();
    if (response.status === 401 || response.status === 403) {
      throw new FalImageError('invalid_key', 'A chave do fal foi recusada.');
    }
    if (response.status === 404 || response.status === 422) {
      throw new FalImageError(
        'discontinued',
        'O modelo do fal não está mais disponível.',
      );
    }
    if (!response.ok) {
      throw new FalImageError('error', `O fal respondeu ${response.status}.`);
    }
    if (!text.trim()) return { status: response.status, payload: null };
    try {
      return { status: response.status, payload: JSON.parse(text) as unknown };
    } catch {
      throw new FalImageError('error', 'O fal devolveu uma resposta inválida.');
    }
  }

  private fetchImpl(): typeof fetch {
    return this.deps.fetchImpl ?? fetch;
  }

  private now(): number {
    return this.deps.now ? this.deps.now() : Date.now();
  }

  private sleep(ms: number): Promise<void> {
    if (this.deps.sleep) return this.deps.sleep(ms);
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

function assertAllowedUrl(url: string, queue: boolean) {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new FalImageError('error', 'O fal devolveu um endereço inválido.');
  }
  if (parsed.protocol !== 'https:') {
    throw new FalImageError('error', 'O fal devolveu um endereço inválido.');
  }
  const host = parsed.hostname.toLowerCase();
  if (queue && host !== 'queue.fal.run' && host !== 'api.fal.ai') {
    throw new FalImageError('error', 'O fal devolveu um endereço inválido.');
  }
  if (!queue && !ALLOWED_IMAGE_HOST.test(host)) {
    throw new FalImageError('error', 'O fal devolveu um endereço inválido.');
  }
}

function readQueueHandle(payload: unknown): {
  statusUrl: string;
  responseUrl: string;
  cancelUrl: string;
} | null {
  if (!payload || typeof payload !== 'object') return null;
  const record = payload as Record<string, unknown>;
  const statusUrl =
    typeof record.status_url === 'string' ? record.status_url : '';
  const responseUrl =
    typeof record.response_url === 'string' ? record.response_url : '';
  const cancelUrl =
    typeof record.cancel_url === 'string' ? record.cancel_url : '';
  if (!statusUrl || !responseUrl || !cancelUrl) return null;
  return { statusUrl, responseUrl, cancelUrl };
}

function readStatus(payload: unknown): string {
  if (!payload || typeof payload !== 'object') return '';
  const status = (payload as { status?: unknown }).status;
  return typeof status === 'string' ? status.toUpperCase() : '';
}

function readImageUrl(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const rawImages = (payload as { images?: unknown }).images;
  const images: unknown[] = Array.isArray(rawImages) ? rawImages : [];
  if (!images.length) return null;
  const first = images[0];
  if (!first || typeof first !== 'object') return null;
  const url = (first as { url?: unknown }).url;
  return typeof url === 'string' && url.trim() ? url.trim() : null;
}
