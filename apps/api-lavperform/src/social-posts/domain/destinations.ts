import { BadRequestException } from '@nestjs/common';

export const DESTINATIONS = [
  'ig_feed',
  'ig_stories',
  'ig_reels',
  'facebook',
  'google',
] as const;

export type Destination = (typeof DESTINATIONS)[number];

const CAROUSEL_BLOCKED: Destination[] = ['ig_stories', 'google'];

export const CAROUSEL_BLOCK_MESSAGE =
  'Stories e Google Meu Negócio não aceitam carrossel. Escolha outro formato ou tire esses destinos.';

export function normalizeDestinations(
  values: string[] | undefined,
  placement?: string | null,
): Destination[] {
  const picked = (values ?? []).filter((item): item is Destination =>
    (DESTINATIONS as readonly string[]).includes(item),
  );
  const unique = [...new Set(picked)];
  if (unique.length) return unique;
  if (placement === 'story') return ['ig_stories'];
  if (placement === 'google') return ['google'];
  return ['ig_feed'];
}

export function legacyPlacement(destinations: Destination[]): string {
  if (destinations.length === 1 && destinations[0] === 'google') return 'google';
  if (
    destinations.includes('ig_stories') &&
    !destinations.includes('ig_feed') &&
    !destinations.includes('facebook')
  ) {
    return 'story';
  }
  return 'feed';
}

export function carouselBlockedBy(destinations: string[]): Destination[] {
  return destinations.filter((item): item is Destination =>
    (CAROUSEL_BLOCKED as readonly string[]).includes(item),
  );
}

export function assertFormatDestinations(
  format: string,
  destinations: string[],
): void {
  if (format === 'carousel' && carouselBlockedBy(destinations).length) {
    throw new BadRequestException(CAROUSEL_BLOCK_MESSAGE);
  }
}

export function resolveSlideCount(format: string, requested?: number): number {
  if (format !== 'carousel') return 1;
  const count = requested ?? 4;
  return Math.min(10, Math.max(2, count));
}
