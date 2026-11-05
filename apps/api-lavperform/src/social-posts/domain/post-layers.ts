import {
  type BrandSnapshot,
  type GeneratedCopy,
  type PostLayer,
  type PostSlide,
} from './social-post.types';

export function buildDefaultLayers(
  brand: BrandSnapshot,
  copy: Pick<GeneratedCopy, 'headline' | 'badgeText'>,
): PostLayer[] {
  const layers: PostLayer[] = [
    {
      id: 'background',
      type: 'background',
      label: 'Arte de fundo (IA)',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      locked: true,
      visible: true,
    },
    {
      id: 'color-band',
      type: 'color-band',
      label: `Faixa de cor ${brand.deepColor}`,
      color: brand.deepColor,
      opacity: 1,
      x: 0,
      y: 42,
      width: 100,
      height: 58,
      locked: false,
      visible: true,
    },
    {
      id: 'logo',
      type: 'logo',
      label: 'Logo',
      x: 94,
      y: 4,
      width: 36,
      logoVariant: 'light',
      locked: false,
      visible: true,
    },
    {
      id: 'title',
      type: 'title',
      label: 'Título',
      text: copy.headline,
      fontFamily: brand.titleFont,
      fontSize: 64,
      color: '#FFFFFF',
      x: 6,
      y: 68,
      width: 88,
      locked: false,
      visible: true,
    },
  ];

  if (copy.badgeText.trim()) {
    layers.push({
      id: 'badge',
      type: 'badge',
      label: 'Selo de oferta',
      text: copy.badgeText.trim(),
      fontFamily: brand.titleFont,
      fontSize: 34,
      color: brand.deepColor,
      backgroundColor: brand.accentColor,
      x: 6,
      y: 86,
      locked: false,
      visible: true,
    });
  }

  return layers;
}

export function buildComposedLayers(): PostLayer[] {
  return [
    {
      id: 'background',
      type: 'background',
      label: 'Arte completa (IA)',
      x: 0,
      y: 0,
      width: 100,
      height: 100,
      locked: true,
      visible: true,
    },
  ];
}

export function buildComposedSlides(images: string[]): PostSlide[] {
  const frames = images.length ? images : [''];
  return frames.map((image) => ({
    backgroundImage: image,
    layers: buildComposedLayers(),
  }));
}

export function buildSlides(
  backgroundImage: string,
  layers: PostLayer[],
  slideCount: number,
): PostSlide[] {
  return Array.from({ length: slideCount }, () => ({
    backgroundImage,
    layers: JSON.parse(JSON.stringify(layers)) as PostLayer[],
  }));
}

export function hexToRgb(
  hex: string,
): { r: number; g: number; b: number } | null {
  const normalized = hex.trim().replace('#', '');
  const value =
    normalized.length === 3
      ? normalized
          .split('')
          .map((char) => char + char)
          .join('')
      : normalized;
  if (!/^[0-9a-fA-F]{6}$/.test(value)) return null;
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

function channel(value: number): number {
  const ratio = value / 255;
  return ratio <= 0.03928 ? ratio / 12.92 : ((ratio + 0.055) / 1.055) ** 2.4;
}

export function contrastRatio(foreground: string, background: string): number {
  const fg = hexToRgb(foreground);
  const bg = hexToRgb(background);
  if (!fg || !bg) return 1;
  const l1 =
    0.2126 * channel(fg.r) + 0.7152 * channel(fg.g) + 0.0722 * channel(fg.b);
  const l2 =
    0.2126 * channel(bg.r) + 0.7152 * channel(bg.g) + 0.0722 * channel(bg.b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}
