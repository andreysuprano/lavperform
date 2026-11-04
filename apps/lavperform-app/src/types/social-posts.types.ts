export const POST_OBJECTIVES = [
  { value: 'promocao', label: 'Promoção' },
  { value: 'cuidado', label: 'Dica de cuidado com roupas' },
  { value: 'novidade', label: 'Novidade / serviço' },
  { value: 'data', label: 'Data comemorativa' },
  { value: 'prova_social', label: 'Prova social' },
  { value: 'reativar', label: 'Reativar clientes' },
] as const

export const ART_STYLES = [
  { value: 'fotografico_clean', label: 'Fotográfico clean' },
  { value: 'ilustracao', label: 'Ilustração suave' },
  { value: 'gradiente', label: 'Gradiente abstrato' },
  { value: 'flat', label: 'Flat geométrico' },
] as const

export const FONT_OPTIONS = [
  'Poppins',
  'Inter',
  'Montserrat',
  'Nunito',
] as const

export const TONE_OPTIONS = [
  'Próximo',
  'Bem-humorado',
  'Formal',
  'Direto',
] as const

export type PostObjective = (typeof POST_OBJECTIVES)[number]['value']
export type ArtStyle = (typeof ART_STYLES)[number]['value']
export type PostFormat = 'feed' | 'story' | 'carousel'
export type CaptionLength = 'short' | 'medium' | 'long'
export type LayerType =
  'background' | 'color-band' | 'logo' | 'title' | 'badge' | 'text'

export interface PostLayer {
  id: string
  type: LayerType
  label: string
  text?: string
  fontFamily?: string
  fontSize?: number
  color?: string
  backgroundColor?: string
  opacity?: number
  x: number
  y: number
  width?: number
  height?: number
  locked: boolean
  visible: boolean
  logoVariant?: 'light' | 'dark'
}

export interface PostSlide {
  backgroundImage: string
  layers: PostLayer[]
}

export interface BrandIdentity {
  id: string | null
  companyId: string
  persisted: boolean
  logoLightUrl: string | null
  logoDarkUrl: string | null
  primaryColor: string
  deepColor: string
  accentColor: string
  neutralColor: string
  titleFont: string
  bodyFont: string
  tones: string[]
  voiceNotes: string | null
  references: string | null
}

export type SaveBrandPayload = Omit<
  BrandIdentity,
  'id' | 'companyId' | 'persisted'
>

export interface PostVersion {
  id: string
  number: number
  source: 'generation' | 'revision' | 'restore' | 'manual' | string
  prompt: string | null
  assistantReply: string | null
  headline: string
  badgeText: string | null
  captionShort: string
  captionMedium: string
  captionLong: string
  activeCaption: CaptionLength | string
  hashtags: string[]
  slides: PostSlide[]
  createdAt?: string
}

export interface PostVariation {
  id: string
  position: number
  headline: string
  badgeText: string | null
  captionShort: string
  captionMedium: string
  captionLong: string
  activeCaption: CaptionLength | string
  hashtags: string[]
  slides: PostSlide[]
  selectedVersionId?: string | null
  versions?: PostVersion[]
}

export interface SocialPostDraft {
  id: string
  companyId: string
  objective: PostObjective | string
  theme: string
  format: PostFormat | string
  slideCount: number
  artStyle: ArtStyle | string
  includeCaption: boolean
  selectedVariationId: string | null
  createdAt: string
  updatedAt: string
  variations: PostVariation[]
}

export interface SocialDraftSummary {
  id: string
  objective: string
  theme: string
  format: string
  slideCount: number
  updatedAt: string
  selectedVariationId: string | null
  variationCount: number
  headline: string | null
}

export interface CreateDraftPayload {
  companyId: string
  objective: string
  theme: string
  format: string
  slideCount?: number
  artStyle: string
  includeCaption?: boolean
}

export interface UpdateVariationPayload {
  slideIndex?: number
  layers?: PostLayer[]
  headline?: string
  badgeText?: string
  activeCaption?: string
  captionShort?: string
  captionMedium?: string
  captionLong?: string
  hashtags?: string[]
}

export const DEFAULT_BRAND: SaveBrandPayload = {
  logoLightUrl: null,
  logoDarkUrl: null,
  primaryColor: '#7BC9F1',
  deepColor: '#093A58',
  accentColor: '#FFD23F',
  neutralColor: '#FFFFFF',
  titleFont: 'Poppins',
  bodyFont: 'Inter',
  tones: ['Próximo'],
  voiceNotes: null,
  references: null,
}

export function activeCaptionText(variation: PostVariation) {
  if (variation.activeCaption === 'short') return variation.captionShort
  if (variation.activeCaption === 'long') return variation.captionLong
  return variation.captionMedium
}

export function captionWithHashtags(variation: PostVariation) {
  const caption = activeCaptionText(variation).trim()
  const tags = variation.hashtags.join(' ')
  return [caption, tags].filter(Boolean).join('\n\n')
}

export function formatAspect(format: string): number {
  if (format === 'story') return 9 / 16
  if (format === 'carousel') return 4 / 5
  return 1
}

export function formatLabel(format: string, slideCount: number) {
  if (format === 'story') return 'Story'
  if (format === 'carousel') return `Carrossel · ${slideCount} slides`
  return 'Feed'
}
