export const DEFAULT_PARTNER_HTTP_DELAY_MS = 400;
export const MAX_RETRIES_ON_429 = 3;

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function parseRetryAfterMs(
  header?: string,
  fallbackMs: number = DEFAULT_PARTNER_HTTP_DELAY_MS,
): number {
  if (header === undefined || header.trim() === '') {
    return fallbackMs;
  }
  const asSeconds = Number.parseInt(header, 10);
  if (!Number.isNaN(asSeconds)) {
    return asSeconds * 1000;
  }

  const date = new Date(header);
  if (!Number.isNaN(date.getTime())) {
    const wait = date.getTime() - Date.now();
    return wait > 0 ? wait : fallbackMs;
  }

  return fallbackMs;
}

export function isHttp429(error: unknown): boolean {
  if (typeof error !== 'object' || error === null) {
    return false;
  }
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 429;
}

function retryAfterHeaderFromError(error: unknown): string | undefined {
  if (typeof error !== 'object' || error === null) {
    return undefined;
  }
  const headers = (error as { response?: { headers?: Record<string, string> } })
    .response?.headers;
  if (!headers) {
    return undefined;
  }
  return headers['retry-after'] ?? headers['Retry-After'];
}

export type With429RetryLogger = {
  warn: (message: string, ...optionalParams: unknown[]) => void;
  error: (message: string, ...optionalParams: unknown[]) => void;
};

export type With429RetryOptions = {
  sleep?: (ms: number) => Promise<void>;
  logger?: With429RetryLogger;
  fallbackMs?: number;
};

export async function with429Retry<T>(
  run: () => Promise<T>,
  options?: With429RetryOptions,
): Promise<T> {
  const sleepFn = options?.sleep ?? sleep;
  let retriesLeft = MAX_RETRIES_ON_429;

  while (true) {
    try {
      return await run();
    } catch (error) {
      if (!isHttp429(error)) {
        throw error;
      }
      if (retriesLeft <= 0) {
        throw error;
      }
      retriesLeft -= 1;
      const delayMs = parseRetryAfterMs(
        retryAfterHeaderFromError(error),
        options?.fallbackMs ?? DEFAULT_PARTNER_HTTP_DELAY_MS,
      );
      options?.logger?.warn?.(
        `HTTP 429: aguardando ${delayMs}ms antes de tentar novamente (${retriesLeft} retries restantes)`,
      );
      await sleepFn(delayMs);
    }
  }
}
