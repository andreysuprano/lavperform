export const REFERENCE_IMAGE_LIMIT = 5;

export const REFERENCE_UNSUPPORTED_WARNING =
  'Este modelo não usa imagens de referência';

export function normalizeReferenceImages(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const images: string[] = [];
  for (const item of value) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (!trimmed) continue;
    if (
      !trimmed.startsWith('data:image/') &&
      !trimmed.startsWith('https://') &&
      !trimmed.startsWith('http://')
    ) {
      continue;
    }
    images.push(trimmed);
    if (images.length === REFERENCE_IMAGE_LIMIT) break;
  }
  return images;
}
