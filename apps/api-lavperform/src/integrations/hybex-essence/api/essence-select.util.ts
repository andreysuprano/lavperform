const ESSENCE_RATE_LIMIT_PATTERN = /limite.*chamadas/i;

export function isEssenceRateLimitBody(data: unknown): boolean {
  return typeof data === 'string' && ESSENCE_RATE_LIMIT_PATTERN.test(data);
}

export function parseEssenceSelectRows<T>(data: unknown): T[] {
  if (isEssenceRateLimitBody(data)) {
    throw new EssenceRateLimitError(String(data).trim());
  }
  if (Array.isArray(data)) {
    return data as T[];
  }
  if (data == null) {
    return [];
  }
  if (typeof data === 'string' && data.trim() === '') {
    return [];
  }
  throw new Error(
    `Resposta Essence inesperada: ${typeof data === 'string' ? data.slice(0, 120) : JSON.stringify(data).slice(0, 120)}`,
  );
}

export class EssenceRateLimitError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EssenceRateLimitError';
  }
}