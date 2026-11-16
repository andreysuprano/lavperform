export const LIBRARY_STATUSES = [
  'rascunho',
  'gerando',
  'gerado',
  'agendado',
  'publicado',
  'falhou',
] as const;

export type LibraryStatus = (typeof LIBRARY_STATUSES)[number];

const CHANNEL_LABEL: Record<string, string> = {
  FACEBOOK: 'Facebook',
  INSTAGRAM: 'Instagram',
  GOOGLE_BUSINESS: 'Google',
};

export function libraryStatus(input: {
  generationStatus?: string | null;
  variationCount: number;
  scheduleStatuses?: string[] | null;
}): LibraryStatus {
  const schedules = (input.scheduleStatuses ?? []).filter(
    (status) => status && status !== 'CANCELLED',
  );
  if (schedules.includes('PUBLISHED')) return 'publicado';
  if (schedules.includes('SCHEDULED') || schedules.includes('PUBLISHING')) {
    return 'agendado';
  }
  if (input.generationStatus === 'generating') return 'gerando';
  if (schedules.includes('FAILED') || input.generationStatus === 'failed') {
    return 'falhou';
  }
  if (input.generationStatus === 'generated' || input.variationCount > 0) {
    return 'gerado';
  }
  return 'rascunho';
}

export function channelLabels(channels: string[]): string[] {
  return [
    ...new Set(
      channels.map((channel) => CHANNEL_LABEL[channel] ?? channel).filter(Boolean),
    ),
  ];
}

export function stripHashtags(value: string): string {
  return value
    .split('\n')
    .map((line) =>
      line
        .replace(/(^|\s)#[\p{L}\p{N}_-]+/gu, ' ')
        .replace(/\s+/g, ' ')
        .trim(),
    )
    .filter(Boolean)
    .join('\n');
}

export function captionExcerpt(
  parts: Array<string | null | undefined>,
  max = 140,
): string {
  const clean =
    parts
      .map((part) => stripHashtags(part ?? ''))
      .find((part) => part.length > 0) ?? '';
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function thumbnailFromSlides(
  slides: unknown,
  maxLength = 150_000,
): string | null {
  if (!Array.isArray(slides) || slides.length === 0) return null;
  const first = slides[0];
  if (!first || typeof first !== 'object') return null;
  const image = (first as { backgroundImage?: unknown }).backgroundImage;
  if (typeof image !== 'string') return null;
  if (
    !image.startsWith('data:image/') &&
    !image.startsWith('https://') &&
    !image.startsWith('http://')
  ) {
    return null;
  }
  if (image.length > maxLength) return null;
  return image;
}
