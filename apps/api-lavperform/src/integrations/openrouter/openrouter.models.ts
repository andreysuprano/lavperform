export const OPENROUTER_MODELS_URL = 'https://openrouter.ai/api/v1/models';

export type OpenRouterModel = {
  id: string;
  name: string;
  imageOutput: boolean;
};

export type ModelSource = 'database' | 'environment' | 'default';

export type ModelChoice = {
  model: string;
  source: ModelSource;
};

const MODEL_ID = /^[^\s/]+(?:\/[^\s/]+)+$/;

export function parseOpenRouterModels(
  payload: unknown,
): OpenRouterModel[] | null {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return null;
  }
  const data = (payload as { data?: unknown }).data;
  if (!Array.isArray(data)) return null;

  const models: OpenRouterModel[] = [];
  for (const item of data) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.id !== 'string') continue;
    const id = record.id.trim();
    if (!id) continue;
    const name =
      typeof record.name === 'string' && record.name.trim()
        ? record.name.trim()
        : id;
    models.push({
      id,
      name,
      imageOutput: modelOutputsImage(record.architecture),
    });
  }
  return models;
}

export function modelOutputsImage(architecture: unknown): boolean {
  if (!architecture || typeof architecture !== 'object') return false;
  const arch = architecture as Record<string, unknown>;
  if (Array.isArray(arch.output_modalities)) {
    return arch.output_modalities.some((item) => item === 'image');
  }
  if (typeof arch.modality === 'string') {
    const output = arch.modality.split('->')[1] ?? '';
    return output.split('+').some((part) => part.trim() === 'image');
  }
  return false;
}

export function imageOutputModels(
  models: OpenRouterModel[],
): OpenRouterModel[] {
  return models.filter((model) => model.imageOutput);
}

export function looksLikeModelId(value: string): boolean {
  return MODEL_ID.test(value);
}

/**
 * Ordem: valor salvo no banco, variável de ambiente, padrão do código.
 * Modelo vazio, fora do catálogo ou sem saída de imagem (no slot de imagem)
 * é ignorado. Sem catálogo, um id no formato provider/model ainda vale.
 * O padrão do código entra mesmo se o catálogo não o listar.
 */
export function chooseModel(input: {
  kind: 'text' | 'image';
  stored: string | null;
  envValue: string | undefined;
  fallback: string;
  catalog: OpenRouterModel[] | null;
}): ModelChoice {
  const candidates: Array<{
    value: string | null | undefined;
    source: ModelSource;
  }> = [
    { value: input.stored, source: 'database' },
    { value: input.envValue, source: 'environment' },
    { value: input.fallback, source: 'default' },
  ];

  for (const candidate of candidates) {
    const id = candidate.value?.trim() ?? '';
    if (!id) continue;
    if (
      candidate.source === 'default' ||
      accepts(id, input.kind, input.catalog)
    ) {
      return { model: id, source: candidate.source };
    }
  }

  return { model: input.fallback, source: 'default' };
}

function accepts(
  id: string,
  kind: 'text' | 'image',
  catalog: OpenRouterModel[] | null,
): boolean {
  if (!catalog) return looksLikeModelId(id);
  const found = catalog.find((model) => model.id === id);
  if (!found) return false;
  if (kind === 'image' && !found.imageOutput) return false;
  return true;
}
