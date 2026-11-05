import { Injectable } from '@nestjs/common';
import { FAL_CURATED_TEXT_TO_IMAGE, type FalCatalogModel } from './fal.catalog';
import { FalQueueClient } from './fal.queue';
import type { PostFormat } from '../../social-posts/domain/social-post.types';

const DEFAULT_FAL_MODEL = 'fal-ai/flux-pro/v1.1';

/**
 * O fal só entra quando SOCIAL_IMAGE_PROVIDER=fal e FAL_KEY existe.
 * Sem a chave, o chamador segue no fluxo atual da OpenRouter.
 */
export function falProviderRequested(): boolean {
  return process.env.SOCIAL_IMAGE_PROVIDER?.trim().toLowerCase() === 'fal';
}

export function falProviderActive(): boolean {
  return falProviderRequested() && Boolean(process.env.FAL_KEY?.trim());
}

export function resolveFalModel(draftModel?: string): FalCatalogModel {
  const fromDraft = findCatalogModel(draftModel);
  if (fromDraft) return fromDraft;
  const fromEnv = findCatalogModel(process.env.FAL_IMAGE_MODEL);
  if (fromEnv) return fromEnv;
  return (
    FAL_CURATED_TEXT_TO_IMAGE.find(
      (model) => model.endpointId === DEFAULT_FAL_MODEL,
    ) ?? FAL_CURATED_TEXT_TO_IMAGE[0]
  );
}

export function referenceModelAlternative(
  current: FalCatalogModel,
): FalCatalogModel | null {
  if (current.referenceEndpoint) return null;
  return (
    FAL_CURATED_TEXT_TO_IMAGE.find(
      (model) =>
        model.recommended && model.referenceEndpoint && !model.deprecated,
    ) ??
    FAL_CURATED_TEXT_TO_IMAGE.find(
      (model) => model.referenceEndpoint && !model.deprecated,
    ) ??
    null
  );
}

@Injectable()
export class SocialImageProvider {
  constructor(private readonly queue: FalQueueClient) {}

  isActive(): boolean {
    return falProviderActive();
  }

  model(draftModel?: string): FalCatalogModel {
    return resolveFalModel(draftModel);
  }

  acceptsReferences(draftModel?: string): boolean {
    return Boolean(this.model(draftModel).referenceEndpoint);
  }

  async generate(input: {
    prompt: string;
    format: PostFormat;
    referenceImages?: string[];
    draftModel?: string;
  }): Promise<string> {
    const model = this.model(input.draftModel);
    const references = this.acceptsReferences(input.draftModel)
      ? (input.referenceImages ?? [])
      : [];
    const result = await this.queue.generate({
      model,
      prompt: input.prompt,
      format: input.format,
      apiKey: process.env.FAL_KEY,
      timeoutMs: positiveEnv('FAL_TIMEOUT_MS', 90_000),
      pollMs: positiveEnv('FAL_POLL_INTERVAL_MS', 1_000),
      referenceImages: references,
    });
    return result.dataUrl;
  }
}

function findCatalogModel(
  value: string | undefined,
): FalCatalogModel | undefined {
  const id = value?.trim().replace(/^fal:/, '');
  if (!id) return undefined;
  return FAL_CURATED_TEXT_TO_IMAGE.find(
    (model) => model.endpointId === id && !model.deprecated,
  );
}

function positiveEnv(name: string, fallback: number): number {
  const parsed = Number(process.env[name] ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
