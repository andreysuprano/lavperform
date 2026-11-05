export const POST_OBJECTIVES = [
  'promocao',
  'cuidado',
  'novidade',
  'data',
  'prova_social',
  'reativar',
  'atrair',
] as const;

export const POST_FORMATS = ['feed', 'story', 'carousel', 'video'] as const;

export const ART_STYLES = [
  'fotografico_clean',
  'ilustracao',
  'gradiente',
  'flat',
] as const;

export const CAPTION_LENGTHS = ['short', 'medium', 'long'] as const;

export const TONE_OPTIONS = [
  'Próximo',
  'Bem-humorado',
  'Formal',
  'Direto',
] as const;

export const FONT_OPTIONS = [
  'Poppins',
  'Inter',
  'Montserrat',
  'Nunito',
] as const;

export const VARIATION_BATCH = 4;

export type PostObjective = (typeof POST_OBJECTIVES)[number];
export type PostFormat = (typeof POST_FORMATS)[number];
export type ArtStyle = (typeof ART_STYLES)[number];
export type CaptionLength = (typeof CAPTION_LENGTHS)[number];

export type LayerType =
  'background' | 'color-band' | 'logo' | 'title' | 'badge' | 'text';

export interface PostLayer {
  id: string;
  type: LayerType;
  label: string;
  text?: string;
  fontFamily?: string;
  fontSize?: number;
  color?: string;
  backgroundColor?: string;
  opacity?: number;
  x: number;
  y: number;
  width?: number;
  height?: number;
  locked: boolean;
  visible: boolean;
  logoVariant?: 'light' | 'dark';
}

export interface PostSlide {
  backgroundImage: string;
  layers: PostLayer[];
}

export interface BrandSnapshot {
  logoLightUrl: string | null;
  logoDarkUrl: string | null;
  primaryColor: string;
  deepColor: string;
  accentColor: string;
  neutralColor: string;
  titleFont: string;
  bodyFont: string;
  tones: string[];
  voiceNotes: string | null;
  references: string | null;
}

export interface GeneratedCopy {
  headline: string;
  badgeText: string;
  captionShort: string;
  captionMedium: string;
  captionLong: string;
  hashtags: string[];
}

export const DEFAULT_BRAND: BrandSnapshot = {
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
};

export const OBJECTIVE_LABELS: Record<PostObjective, string> = {
  promocao: 'Promoção',
  cuidado: 'Dica de cuidado com roupas',
  novidade: 'Novidade / serviço',
  data: 'Data comemorativa',
  prova_social: 'Prova social',
  reativar: 'Reativar clientes',
  atrair: 'Trazer clientes novos',
};

export const ART_STYLE_PROMPTS: Record<ArtStyle, string> = {
  fotografico_clean:
    'clean bright photography, soft daylight, airy laundry room, no people, no signage',
  ilustracao: 'soft illustration, gentle shapes, paper texture, no letters',
  gradiente:
    'abstract smooth gradient and soft bubbles, no objects with labels',
  flat: 'flat geometric shapes, simple laundry motifs, no letters',
};
