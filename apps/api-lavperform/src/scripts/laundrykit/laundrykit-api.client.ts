import axios from 'axios';

export interface LaundryKitRouteArgs {
  laundrykitUrl: string;
  accessToken: string;
  storeId: string;
  fetchRetries: number;
}

function normalizeAccessToken(rawToken: string): string {
  return rawToken.trim().replace(/^Bearer\s+/i, '');
}

export function buildLaundrykitHeaders(accessToken: string): Record<string, string> {
  return {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    Authorization: `Bearer ${normalizeAccessToken(accessToken)}`,
    Origin: 'https://www.laundrykit-dash.com',
    Referer: 'https://www.laundrykit-dash.com/',
    'User-Agent':
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36',
  };
}

function formatAxiosError(error: unknown): string {
  if (!axios.isAxiosError(error)) {
    return String(error);
  }

  const status = error.response?.status;
  const statusText = error.response?.statusText;
  const body = error.response?.data ?? error.message;
  const statusLabel = status
    ? `HTTP ${status}${statusText ? ` ${statusText}` : ''}`
    : 'sem status HTTP';

  return `${statusLabel}: ${JSON.stringify(body)}`;
}

function isRetryableFetchError(error: unknown): boolean {
  if (!axios.isAxiosError(error)) return false;

  const status = error.response?.status;
  if (status === 429) return true;
  if (status !== undefined && status >= 500) return true;

  return (
    error.code === 'ECONNABORTED' ||
    error.code === 'ECONNRESET' ||
    error.code === 'ETIMEDOUT'
  );
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function postLaundrykitRoute<T>(
  args: LaundryKitRouteArgs,
  body: Record<string, unknown>,
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= args.fetchRetries; attempt += 1) {
    try {
      const response = await axios.post<T>(args.laundrykitUrl, body, {
        timeout: 120_000,
        headers: buildLaundrykitHeaders(args.accessToken),
        validateStatus: (status) => status >= 200 && status < 300,
      });

      return response.data;
    } catch (error) {
      lastError = error;

      if (attempt < args.fetchRetries && isRetryableFetchError(error)) {
        const waitMs = 1000 * attempt;
        console.warn(
          `   ⚠️ Tentativa ${attempt}/${args.fetchRetries} falhou (${formatAxiosError(error)}). Retentando em ${waitMs}ms...`,
        );
        await sleep(waitMs);
        continue;
      }

      throw error;
    }
  }

  throw lastError;
}
