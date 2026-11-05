export type ImageProviderId = 'openrouter' | 'fal';

export type ParsedImageModelId = {
  provider: ImageProviderId;
  modelId: string;
  qualified: string;
};

/** Id sem prefixo continua sendo OpenRouter. */
export function parseImageModelId(value: string): ParsedImageModelId {
  const trimmed = value.trim();
  if (trimmed.toLowerCase().startsWith('fal:')) {
    const modelId = trimmed.slice(4).trim();
    return { provider: 'fal', modelId, qualified: `fal:${modelId}` };
  }
  const modelId = trimmed.toLowerCase().startsWith('openrouter:')
    ? trimmed.slice('openrouter:'.length).trim()
    : trimmed;
  return {
    provider: 'openrouter',
    modelId,
    qualified: `openrouter:${modelId}`,
  };
}

export function sameImageModel(left: string, right: string): boolean {
  return (
    parseImageModelId(left).qualified === parseImageModelId(right).qualified
  );
}
