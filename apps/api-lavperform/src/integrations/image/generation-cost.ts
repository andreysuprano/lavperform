/**
 * Orçamento usado só para estimar o custo de uma geração a partir do
 * preço por token publicado pela OpenRouter. Não é uma cobrança medida.
 * Texto: briefing + 4 variações. Imagem: ~1290 tokens de saída, tamanho
 * que a OpenRouter usa para uma imagem de cerca de 1 megapixel.
 */
export const TEXT_GENERATION_INPUT_TOKENS = 1500;
export const TEXT_GENERATION_OUTPUT_TOKENS = 800;
export const IMAGE_OUTPUT_TOKENS = 1290;
/** Feed quadrado 1024×1024, em megapixels, para preço por megapixel do fal. */
export const IMAGE_MEGAPIXELS = (1024 * 1024) / 1_000_000;

export type TokenPricing = {
  prompt: number;
  completion: number;
  request: number;
  image: number;
  imageOutput: number;
};

export type GenerationCost = {
  usd: number;
  estimated: boolean;
  label: string;
};

export function readTokenPricing(value: unknown): TokenPricing | null {
  if (!value || typeof value !== 'object') return null;
  const record = value as Record<string, unknown>;
  const pricing = {
    prompt: readPrice(record.prompt),
    completion: readPrice(record.completion),
    request: readPrice(record.request),
    image: readPrice(record.image),
    imageOutput: readPrice(record.image_output ?? record.imageOutput),
  };
  if (
    pricing.prompt === 0 &&
    pricing.completion === 0 &&
    pricing.request === 0 &&
    pricing.image === 0 &&
    pricing.imageOutput === 0
  ) {
    return null;
  }
  return pricing;
}

export function textGenerationCost(
  pricing: TokenPricing | null,
): GenerationCost | null {
  if (!pricing) return null;
  const usd =
    pricing.prompt * TEXT_GENERATION_INPUT_TOKENS +
    pricing.completion * TEXT_GENERATION_OUTPUT_TOKENS +
    pricing.request;
  if (usd <= 0) return null;
  return {
    usd,
    estimated: true,
    label: `cerca de ${formatUsd(usd)}`,
  };
}

export function openRouterImageCost(
  pricing: TokenPricing | null,
): GenerationCost | null {
  if (!pricing) return null;
  if (pricing.image >= 0.001 && pricing.imageOutput === 0) {
    return {
      usd: pricing.image,
      estimated: false,
      label: formatUsd(pricing.image),
    };
  }
  if (pricing.imageOutput > 0) {
    const usd =
      pricing.imageOutput * IMAGE_OUTPUT_TOKENS +
      pricing.prompt * 200 +
      pricing.completion * 50 +
      pricing.request;
    return {
      usd,
      estimated: true,
      label: `cerca de ${formatUsd(usd)}`,
    };
  }
  if (pricing.image > 0) {
    return {
      usd: pricing.image,
      estimated: true,
      label: `cerca de ${formatUsd(pricing.image)}`,
    };
  }
  return null;
}

export type FalPrice = {
  endpointId: string;
  unitPrice: number;
  unit: string;
  currency: string;
};

export function parseFalPrices(payload: unknown): FalPrice[] | null {
  if (!payload || typeof payload !== 'object') return null;
  const prices = (payload as { prices?: unknown }).prices;
  if (!Array.isArray(prices)) return null;
  const parsed: FalPrice[] = [];
  for (const item of prices) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    if (typeof record.endpoint_id !== 'string') continue;
    const unitPrice = readPrice(record.unit_price);
    if (!Number.isFinite(unitPrice) || unitPrice < 0) continue;
    parsed.push({
      endpointId: record.endpoint_id.trim(),
      unitPrice,
      unit: typeof record.unit === 'string' ? record.unit.trim() : 'image',
      currency: typeof record.currency === 'string' ? record.currency : 'USD',
    });
  }
  return parsed;
}

export function falGenerationCost(
  price: FalPrice | undefined,
): GenerationCost | null {
  if (!price || price.currency.toUpperCase() !== 'USD') return null;
  const unit = price.unit.toLowerCase();
  if (
    unit === 'image' ||
    unit === 'images' ||
    unit === 'generation' ||
    unit === 'generations'
  ) {
    return {
      usd: price.unitPrice,
      estimated: false,
      label: formatUsd(price.unitPrice),
    };
  }
  if (unit.includes('megapixel')) {
    const usd = price.unitPrice * IMAGE_MEGAPIXELS;
    return {
      usd,
      estimated: true,
      label: `cerca de ${formatUsd(usd)}`,
    };
  }
  return {
    usd: price.unitPrice,
    estimated: true,
    label: `cerca de ${formatUsd(price.unitPrice)}`,
  };
}

export function formatUsd(usd: number): string {
  const digits = usd < 0.01 ? 4 : 2;
  return `US$ ${usd.toFixed(digits).replace('.', ',')}`;
}

export function formatDuration(seconds: number, estimated: boolean): string {
  const rounded = Math.max(1, Math.round(seconds));
  return estimated ? `${rounded} s estimados` : `${rounded} s`;
}

function readPrice(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}
