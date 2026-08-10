/**
 * URL pública do lavai-agent (API REST + Socket.IO).
 *
 * NEXT_PUBLIC_* é injetada em build time — configure no Docker/Easypanel
 * ANTES do `npm run build`, não só em runtime.
 */
export function getPublicApiUrl(): string {
  const url = process.env.NEXT_PUBLIC_API_URL?.trim();
  if (url) return url.replace(/\/$/, '');

  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }

  console.warn(
    '[lavai-dashboard] NEXT_PUBLIC_API_URL não definida no build — requisições podem falhar.',
  );
  return '';
}
