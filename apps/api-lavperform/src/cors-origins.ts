const DEFAULT_CORS_ORIGINS = ['https://app.lavperform.cloud'];

export function parseCorsOrigins(raw: string | undefined | null): string[] {
  const origins = (raw ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter((origin) => origin.length > 0 && origin !== '*');

  if (origins.length === 0) {
    return [...DEFAULT_CORS_ORIGINS];
  }

  return origins;
}
