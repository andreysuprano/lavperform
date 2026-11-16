import { BadRequestException } from '@nestjs/common';
import {
  assertFormatDestinations,
  CAROUSEL_BLOCK_MESSAGE,
  normalizeDestinations,
  resolveSlideCount,
} from 'src/social-posts/domain/destinations';

describe('formato e destinos', () => {
  it('impede carrossel em Stories e no Google', () => {
    expect(() =>
      assertFormatDestinations('carousel', ['ig_stories', 'facebook']),
    ).toThrow(BadRequestException);
    expect(() => assertFormatDestinations('carousel', ['google'])).toThrow(
      CAROUSEL_BLOCK_MESSAGE,
    );
    expect(() =>
      assertFormatDestinations('carousel', ['ig_feed', 'facebook']),
    ).not.toThrow();
    expect(() =>
      assertFormatDestinations('feed', ['ig_stories', 'google']),
    ).not.toThrow();
  });

  it('separa destino antigo do formato e fixa a quantidade de slides', () => {
    expect(normalizeDestinations(undefined, 'story')).toEqual(['ig_stories']);
    expect(normalizeDestinations(['ig_reels', 'ig_reels'])).toEqual(['ig_reels']);
    expect(resolveSlideCount('carousel', 1)).toBe(2);
    expect(resolveSlideCount('carousel', 8)).toBe(8);
    expect(resolveSlideCount('video', 6)).toBe(1);
    expect(resolveSlideCount('feed')).toBe(1);
  });
});
