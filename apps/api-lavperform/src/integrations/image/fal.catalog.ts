import type { OpenRouterModel } from '../openrouter/openrouter.models';
import { DEFAULT_IMAGE_MODEL } from '../openrouter/openrouter.types';
import {
  falGenerationCost,
  formatDuration,
  openRouterImageCost,
  textGenerationCost,
  type FalPrice,
  type GenerationCost,
} from './generation-cost';
import { parseImageModelId } from './image-model-id';

export const FAL_QUEUE_ORIGIN = 'https://queue.fal.run';
export const FAL_MODELS_URL = 'https://api.fal.ai/v1/models';
export const FAL_PRICING_URL = 'https://api.fal.ai/v1/models/pricing';

/**
 * Prompt único das miniaturas do admin. Todas as amostras usam este texto,
 * no formato quadrado, para a comparação entre modelos ser justa.
 * Não leva marca, legenda nem tema do cliente.
 */
export const IMAGE_EXAMPLE_PROMPT =
  'Bright airy laundry room, folded white towels on a pale wooden table, soft daylight, clean background, no text, no letters, no numbers, no logo, no watermark.';

export type ImageUse = 'photoreal' | 'illustration' | 'text' | 'fast' | 'other';

export type FalSizeMode = 'image_size' | 'aspect_ratio';

export type FalReferenceField = 'image_url' | 'image_urls';

export type FalCatalogModel = {
  endpointId: string;
  name: string;
  use: ImageUse;
  recommended: boolean;
  sizeMode: FalSizeMode;
  estimatedSeconds: number;
  deprecated: boolean;
  /** Endpoint image-to-image, redux ou edit. Null não aceita referência. */
  referenceEndpoint: string | null;
  referenceField: FalReferenceField | null;
};

/**
 * Higgsfield Soul não tem endpoint público de text-to-image no fal
 * (a API dele é própria). Se a listagem do fal devolver um modelo com
 * esse nome, ele entra pelo merge. Não inventamos um id.
 */
export const FAL_CURATED_TEXT_TO_IMAGE: FalCatalogModel[] = [
  {
    endpointId: 'fal-ai/flux-pro/v1.1',
    name: 'FLUX 1.1 Pro',
    use: 'photoreal',
    recommended: true,
    sizeMode: 'image_size',
    estimatedSeconds: 12,
    deprecated: false,
    referenceEndpoint: 'fal-ai/flux-pro/v1.1/redux',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/flux-pro/v1.1-ultra',
    name: 'FLUX 1.1 Ultra',
    use: 'photoreal',
    recommended: false,
    sizeMode: 'aspect_ratio',
    estimatedSeconds: 18,
    deprecated: false,
    referenceEndpoint: 'fal-ai/flux-pro/v1.1-ultra/redux',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/flux/dev',
    name: 'FLUX Dev',
    use: 'illustration',
    recommended: false,
    sizeMode: 'image_size',
    estimatedSeconds: 8,
    deprecated: false,
    referenceEndpoint: 'fal-ai/flux/dev/image-to-image',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/flux/schnell',
    name: 'FLUX Schnell',
    use: 'fast',
    recommended: true,
    sizeMode: 'image_size',
    estimatedSeconds: 4,
    deprecated: false,
    referenceEndpoint: 'fal-ai/flux/schnell/redux',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/bytedance/seedream/v4.5/text-to-image',
    name: 'Seedream',
    use: 'photoreal',
    recommended: false,
    sizeMode: 'image_size',
    estimatedSeconds: 10,
    deprecated: false,
    referenceEndpoint: 'fal-ai/bytedance/seedream/v4.5/edit',
    referenceField: 'image_urls',
  },
  {
    endpointId: 'fal-ai/ideogram/v3',
    name: 'Ideogram',
    use: 'text',
    recommended: true,
    sizeMode: 'image_size',
    estimatedSeconds: 11,
    deprecated: false,
    referenceEndpoint: 'fal-ai/ideogram/v3/remix',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/recraft/v3/text-to-image',
    name: 'Recraft',
    use: 'illustration',
    recommended: true,
    sizeMode: 'image_size',
    estimatedSeconds: 9,
    deprecated: false,
    referenceEndpoint: 'fal-ai/recraft/v3/image-to-image',
    referenceField: 'image_url',
  },
  {
    endpointId: 'fal-ai/imagen4/preview',
    name: 'Imagen',
    use: 'photoreal',
    recommended: false,
    sizeMode: 'aspect_ratio',
    estimatedSeconds: 14,
    deprecated: false,
    referenceEndpoint: null,
    referenceField: null,
  },
  {
    endpointId: 'fal-ai/kling-image/v3/text-to-image',
    name: 'Kling Image',
    use: 'photoreal',
    recommended: false,
    sizeMode: 'aspect_ratio',
    estimatedSeconds: 10,
    deprecated: false,
    referenceEndpoint: null,
    referenceField: null,
  },
];

export const IMAGE_USE_ORDER: ImageUse[] = [
  'photoreal',
  'illustration',
  'text',
  'fast',
  'other',
];

export const IMAGE_USE_LABEL: Record<ImageUse, string> = {
  photoreal: 'Fotorrealista',
  illustration: 'Arte e ilustração',
  text: 'Texto na imagem',
  fast: 'Rápido/barato',
  other: 'Outros',
};

export type ImageModelOption = {
  id: string;
  name: string;
  imageOutput: true;
  provider: 'openrouter' | 'fal';
  use: ImageUse;
  recommended: boolean;
  enabled: boolean;
  disabledReason: string | null;
  costLabel: string | null;
  costEstimated: boolean;
  durationLabel: string | null;
  durationEstimated: boolean;
  thumbnailUrl: string | null;
  supportsReferenceImages: boolean;
};

export type TextModelOption = OpenRouterModel & {
  provider: 'openrouter';
  costLabel: string | null;
  costEstimated: boolean;
};

const RECOMMENDED_LIMIT = 5;

export function parseFalModelsApi(payload: unknown): FalCatalogModel[] | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const models = (payload as { models?: unknown }).models;
  if (!Array.isArray(models)) return null;
  const parsed: FalCatalogModel[] = [];
  for (const item of models) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.endpoint_id !== 'string') continue;
    const endpointId = record.endpoint_id.trim();
    if (!endpointId) continue;
    const metadata =
      record.metadata && typeof record.metadata === 'object'
        ? (record.metadata as Record<string, unknown>)
        : {};
    const category =
      typeof metadata.category === 'string' ? metadata.category : '';
    if (category && category !== 'text-to-image') continue;
    const name =
      typeof metadata.display_name === 'string' && metadata.display_name.trim()
        ? metadata.display_name.trim()
        : endpointId;
    const deprecated = metadata.status === 'deprecated';
    parsed.push(classifyFalModel(endpointId, name, deprecated, metadata));
  }
  return parsed;
}

export function mergeFalCatalog(
  apiModels: FalCatalogModel[] | null,
): FalCatalogModel[] {
  const byId = new Map<string, FalCatalogModel>();
  for (const model of FAL_CURATED_TEXT_TO_IMAGE) {
    byId.set(model.endpointId, { ...model });
  }
  for (const model of apiModels ?? []) {
    const current = byId.get(model.endpointId);
    if (!current) {
      byId.set(model.endpointId, model);
      continue;
    }
    byId.set(model.endpointId, {
      ...current,
      name: model.name || current.name,
      deprecated: current.deprecated || model.deprecated,
    });
  }
  return [...byId.values()];
}

export function buildTextModelOptions(
  models: OpenRouterModel[],
): TextModelOption[] {
  return models.map((model) => {
    const cost = textGenerationCost(
      (
        model as OpenRouterModel & {
          pricing?: Parameters<typeof textGenerationCost>[0];
        }
      ).pricing ?? null,
    );
    return {
      ...model,
      provider: 'openrouter',
      costLabel: cost?.label ?? null,
      costEstimated: cost?.estimated ?? false,
    };
  });
}

export function buildImageModelOptions(input: {
  openrouter: OpenRouterModel[] | null;
  falModels: FalCatalogModel[];
  falConfigured: boolean;
  prices: FalPrice[];
  measuredMs: Map<string, number>;
  thumbnails: Map<string, string>;
}): ImageModelOption[] {
  const priceById = new Map(
    input.prices.map((price) => [price.endpointId, price]),
  );
  const openrouterOptions = (input.openrouter ?? [])
    .filter((model) => model.imageOutput)
    .map((model) =>
      openRouterOption(model, input.measuredMs, input.thumbnails),
    );
  const falOptions = input.falModels.map((model) =>
    falOption(
      model,
      input.falConfigured,
      priceById,
      input.measuredMs,
      input.thumbnails,
    ),
  );
  const merged = [...openrouterOptions, ...falOptions];
  const recommended = merged
    .filter((model) => model.recommended)
    .slice(0, RECOMMENDED_LIMIT);
  const recommendedIds = new Set(recommended.map((model) => model.id));
  return merged.map((model) =>
    recommendedIds.has(model.id) ? model : { ...model, recommended: false },
  );
}

export function recommendedModels(
  models: ImageModelOption[],
): ImageModelOption[] {
  return models
    .filter((model) => model.recommended)
    .slice(0, RECOMMENDED_LIMIT);
}

function openRouterOption(
  model: OpenRouterModel,
  measuredMs: Map<string, number>,
  thumbnails: Map<string, string>,
): ImageModelOption {
  const id = `openrouter:${model.id}`;
  const priced = model as OpenRouterModel & {
    imageInput?: boolean;
    pricing?: Parameters<typeof openRouterImageCost>[0];
  };
  const cost = openRouterImageCost(priced.pricing ?? null);
  const measured = measuredMs.get(id);
  const estimatedSeconds = /flash|schnell|turbo/i.test(model.id) ? 8 : 12;
  return {
    id,
    name: model.name,
    imageOutput: true,
    provider: 'openrouter',
    use: classifyOpenRouterUse(model.id, model.name),
    recommended: model.id === DEFAULT_IMAGE_MODEL,
    enabled: true,
    disabledReason: null,
    costLabel: cost?.label ?? null,
    costEstimated: cost?.estimated ?? false,
    durationLabel: durationLabel(measured, estimatedSeconds),
    durationEstimated: measured == null,
    thumbnailUrl: thumbnails.get(id) ?? null,
    supportsReferenceImages:
      priced.imageInput === true || model.id === DEFAULT_IMAGE_MODEL,
  };
}

function falOption(
  model: FalCatalogModel,
  configured: boolean,
  prices: Map<string, FalPrice>,
  measuredMs: Map<string, number>,
  thumbnails: Map<string, string>,
): ImageModelOption {
  const id = `fal:${model.endpointId}`;
  const cost: GenerationCost | null = falGenerationCost(
    prices.get(model.endpointId),
  );
  const measured = measuredMs.get(id);
  let disabledReason: string | null = null;
  if (!configured) {
    disabledReason = 'A chave do fal não está configurada no servidor.';
  } else if (model.deprecated) {
    disabledReason = 'Este modelo foi descontinuado no fal.';
  }
  return {
    id,
    name: model.name,
    imageOutput: true,
    provider: 'fal',
    use: model.use,
    recommended: model.recommended && !model.deprecated,
    enabled: configured && !model.deprecated,
    disabledReason,
    costLabel: cost?.label ?? null,
    costEstimated: cost?.estimated ?? false,
    durationLabel: durationLabel(measured, model.estimatedSeconds),
    durationEstimated: measured == null,
    thumbnailUrl: thumbnails.get(id) ?? null,
    supportsReferenceImages: Boolean(model.referenceEndpoint),
  };
}

function durationLabel(
  measuredMs: number | undefined,
  estimatedSeconds: number,
): string {
  if (measuredMs != null && measuredMs > 0) {
    return formatDuration(measuredMs / 1000, false);
  }
  return formatDuration(estimatedSeconds, true);
}

function classifyOpenRouterUse(id: string, name: string): ImageUse {
  const hay = `${id} ${name}`.toLowerCase();
  if (/ideogram|recraft/.test(hay) && /ideogram/.test(hay)) return 'text';
  if (/recraft|illustration|ilustra/.test(hay)) return 'illustration';
  if (/schnell|flash|turbo|klein/.test(hay)) return 'fast';
  if (/flux|imagen|seedream|kling|photon|ultra|pro/.test(hay))
    return 'photoreal';
  return 'other';
}

function classifyFalModel(
  endpointId: string,
  name: string,
  deprecated: boolean,
  metadata: Record<string, unknown>,
): FalCatalogModel {
  const hay = `${endpointId} ${name}`.toLowerCase();
  const curated = FAL_CURATED_TEXT_TO_IMAGE.find(
    (model) => model.endpointId === endpointId,
  );
  if (curated) return { ...curated, name, deprecated };
  const estimate = Number(metadata.duration_estimate);
  const estimatedSeconds =
    Number.isFinite(estimate) && estimate > 0
      ? Math.max(1, Math.round(estimate * 60))
      : 12;
  let use: ImageUse = 'other';
  if (/higgsfield|recraft|illustration/.test(hay)) use = 'illustration';
  else if (/ideogram/.test(hay)) use = 'text';
  else if (/schnell|turbo|flash|klein/.test(hay)) use = 'fast';
  else if (/flux|imagen|seedream|kling|ultra|photo/.test(hay))
    use = 'photoreal';
  const sizeMode: FalSizeMode = /ultra|imagen|kling|higgsfield/.test(hay)
    ? 'aspect_ratio'
    : 'image_size';
  const reference = /\/(edit|redux|remix|image-to-image)(\/|$)/.test(
    endpointId,
  );
  return {
    endpointId,
    name,
    use,
    recommended: false,
    sizeMode,
    estimatedSeconds,
    deprecated,
    referenceEndpoint: reference ? endpointId : null,
    referenceField: reference
      ? endpointId.includes('/edit')
        ? 'image_urls'
        : 'image_url'
      : null,
  };
}

export function referenceAlternative(
  models: ImageModelOption[],
  currentId: string,
): ImageModelOption | null {
  const candidates = models.filter(
    (model) =>
      model.enabled && model.supportsReferenceImages && model.id !== currentId,
  );
  return candidates.find((model) => model.recommended) ?? candidates[0] ?? null;
}

export function falModelByEndpoint(
  models: FalCatalogModel[],
  endpointId: string,
): FalCatalogModel | undefined {
  return models.find((model) => model.endpointId === endpointId);
}

export function endpointIdOf(qualifiedOrRaw: string): string {
  return parseImageModelId(qualifiedOrRaw).modelId;
}
