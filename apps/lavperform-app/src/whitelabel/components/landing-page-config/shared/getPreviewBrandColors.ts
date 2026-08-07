import type { BrandingData } from '../../../types'

/** Fallbacks alinhados ao template default do backend */
const FALLBACK_BRAND_COLORS = {
  primary: '#3B82F6',
  secondary: '#10B981',
  tertiary: '#F59E0B',
} as const

export type PreviewBrandColors = {
  primary: string
  secondary: string
  tertiary: string
}

export function getPreviewBrandColors(
  branding?: Pick<
    BrandingData,
    'primaryColor' | 'secondaryColor' | 'tertiaryColor'
  > | null
): PreviewBrandColors {
  return {
    primary: branding?.primaryColor?.trim() || FALLBACK_BRAND_COLORS.primary,
    secondary:
      branding?.secondaryColor?.trim() || FALLBACK_BRAND_COLORS.secondary,
    tertiary: branding?.tertiaryColor?.trim() || FALLBACK_BRAND_COLORS.tertiary,
  }
}
