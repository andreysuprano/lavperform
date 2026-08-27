import type { Metadata } from "next"

export const KNOWN_BRAND_THEMES = ["default", "custom", "seld"] as const

export type KnownBrandTheme = (typeof KNOWN_BRAND_THEMES)[number]
export type BrandTheme = string

/** @deprecated use KNOWN_BRAND_THEMES */
export const BRAND_THEMES = KNOWN_BRAND_THEMES

export const BRAND_ASSETS = [
  "favicon",
  "logo",
  "logo_dark",
  "logo_icon",
  "bg_login",
  "bg_default",
  "pwa-192x192",
  "pwa-512x512",
  "anuncio",
] as const

export type BrandAsset = (typeof BRAND_ASSETS)[number]

const BRAND_ASSET_FILES: Record<BrandAsset, string> = {
  favicon: "favicon.ico",
  logo: "logo.png",
  logo_dark: "logo_dark.png",
  logo_icon: "logo_icon.png",
  bg_login: "bg_login.png",
  bg_default: "bg_default.png",
  "pwa-192x192": "pwa-192x192.png",
  "pwa-512x512": "pwa-512x512.png",
  anuncio: "anuncio.jpg",
}

export const DEFAULT_BRAND_THEME = "default" satisfies KnownBrandTheme
export const BRAND_FALLBACK_IMAGE = "/fallback.jpg"

const BRAND_THEME_PATTERN = /^[a-z0-9_-]+$/

export function resolveBrandTheme(
  value: string | undefined
): BrandTheme {
  const normalized = value?.trim().toLowerCase()

  if (normalized && BRAND_THEME_PATTERN.test(normalized)) {
    return normalized
  }

  return DEFAULT_BRAND_THEME
}

export function getBrandThemeFromEnv(): BrandTheme {
  return resolveBrandTheme(process.env.NEXT_PUBLIC_BRAND)
}

export function getBrandNameFromEnv(): string {
  return process.env.NEXT_PUBLIC_BRAND_NAME ?? "LavPerform Admin"
}

export function getBrandAssetPath(
  theme: BrandTheme,
  asset: BrandAsset
): string {
  return `/${theme}/${BRAND_ASSET_FILES[asset]}`
}

export function getBrandAssetUrl(
  theme: BrandTheme,
  asset: BrandAsset
): string {
  return getBrandAssetPath(theme, asset)
}

export function getBrandAssetFallbackUrl(asset: BrandAsset): string {
  if (asset === "favicon") {
    return getBrandAssetPath(DEFAULT_BRAND_THEME, "favicon")
  }

  return BRAND_FALLBACK_IMAGE
}

export type BrandConfig = {
  theme: BrandTheme
  appName: string
  getAssetUrl: (asset: BrandAsset) => string
  getAssetFallbackUrl: (asset: BrandAsset) => string
}

export function createBrandConfig(
  theme: BrandTheme,
  appName: string
): BrandConfig {
  return {
    theme,
    appName,
    getAssetUrl: (asset) => getBrandAssetUrl(theme, asset),
    getAssetFallbackUrl: (asset) => {
      const defaultAssetUrl = getBrandAssetUrl(DEFAULT_BRAND_THEME, asset)

      if (theme !== DEFAULT_BRAND_THEME) {
        return defaultAssetUrl
      }

      return getBrandAssetFallbackUrl(asset)
    },
  }
}

export function getBrandConfig(): BrandConfig {
  return createBrandConfig(getBrandThemeFromEnv(), getBrandNameFromEnv())
}

export function getBrandSiteUrlFromEnv(): string | undefined {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (appUrl) return appUrl

  const connectBaseUrl = process.env.NEXT_PUBLIC_WHATSAPP_CONNECT_BASE_URL?.trim()
  if (connectBaseUrl) return connectBaseUrl

  return undefined
}

export function createBrandMetadata(options: {
  description: string
}): Metadata {
  const brand = getBrandConfig()
  const logoIconUrl = brand.getAssetUrl("logo_icon")
  const siteUrl = getBrandSiteUrlFromEnv()

  const metadata: Metadata = {
    title: brand.appName,
    description: options.description,
    icons: {
      icon: brand.getAssetUrl("favicon"),
      apple: brand.getAssetUrl("pwa-192x192"),
    },
    openGraph: {
      title: brand.appName,
      description: options.description,
      type: "website",
      images: [
        {
          url: logoIconUrl,
          alt: brand.appName,
        },
      ],
    },
    twitter: {
      card: "summary",
      title: brand.appName,
      description: options.description,
      images: [logoIconUrl],
    },
  }

  if (siteUrl) {
    metadata.metadataBase = new URL(siteUrl)
  }

  return metadata
}
