/**
 * White Label Configuration Types
 * Define a estrutura de configuração para temas personalizados
 */

export interface ThemeColors {
  primary: string
}

export interface ThemeImages {
  logo: string
  logoDark: string
  logoIcon: string
  favicon: string
  loginLeftImage?: string
  pwaIcon192?: string
  pwaIcon512?: string
  bannerCampanhas?: string
  [key: string]: string | undefined
}

// Tipo recursivo para suportar objetos aninhados
export type NestedTexts = {
  [key: string]: string | NestedTexts | undefined
}

export interface ThemeTexts extends NestedTexts {
  link: string
  appName: string
  appShortName: string
  appDescription: string
  copyright?: string
  redirectWhatsAppPage: string
  // Permite qualquer estrutura aninhada
  [key: string]: string | NestedTexts | undefined
}

export interface ThemeFonts {
  body: string
  heading: string
  mono?: string
}

export interface ThemeFeatures {
  hasDelivery: boolean
}

export interface ThemeConfig {
  id: string
  name: string
  colorPalette:
    | 'blue'
    | 'red'
    | 'green'
    | 'yellow'
    | 'purple'
    | 'pink'
    | 'orange'
    | 'border'
    | 'bg'
    | 'current'
    | 'transparent'
    | 'black'
    | 'white'
    | 'fg'
    | 'cyan'
    | 'gray'
    | 'teal'
    | 'whiteAlpha'
    | 'blackAlpha'
  colors: ThemeColors
  images: ThemeImages
  texts: ThemeTexts
  fonts?: ThemeFonts
  features: ThemeFeatures
}

export interface WhiteLabelConfig {
  currentTheme: string
  themes: Record<string, ThemeConfig>
}
