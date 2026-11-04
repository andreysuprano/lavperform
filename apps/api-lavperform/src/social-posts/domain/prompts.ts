import {
  ART_STYLE_PROMPTS,
  OBJECTIVE_LABELS,
  type ArtStyle,
  type BrandSnapshot,
  type CaptionLength,
  type GeneratedCopy,
  type PostFormat,
  type PostObjective,
} from './social-post.types';

const COPY_SHAPE = `{"variations":[{"headline":"","badgeText":"","captionShort":"","captionMedium":"","captionLong":"","hashtags":["#exemplo"]}]}`;

export function buildCopyMessages(input: {
  companyName: string;
  brand: BrandSnapshot;
  objective: PostObjective;
  theme: string;
  format: PostFormat;
  count: number;
  includeCaption: boolean;
}) {
  const tones = input.brand.tones.length
    ? input.brand.tones.join(', ')
    : 'Próximo';
  const system = [
    'Você escreve posts de redes sociais para lavanderias no Brasil.',
    'Responda apenas JSON válido, sem markdown, neste formato:',
    COPY_SHAPE,
    `Gere exatamente ${input.count} variações, cada uma com um ângulo diferente.`,
    'headline: até 8 palavras, sem hashtag e sem emoji.',
    'badgeText: selo curto de oferta ou vazio.',
    'captionShort até 140 caracteres, captionMedium até 320, captionLong até 700.',
    'hashtags: de 4 a 8, com #, sem espaço interno.',
    `Tom de voz obrigatório: ${tones}.`,
    input.brand.voiceNotes
      ? `Notas de voz da marca: ${input.brand.voiceNotes}`
      : '',
    input.brand.references
      ? `Referências da marca (não copie literalmente): ${input.brand.references}`
      : '',
    input.includeCaption
      ? 'Preencha as três legendas.'
      : 'Deixe captionShort, captionMedium e captionLong como string vazia e hashtags como array vazio.',
    'Não descreva layout, cores ou instruções de imagem. O fundo é gerado à parte.',
  ]
    .filter(Boolean)
    .join('\n');

  const user = [
    `Marca: ${input.companyName}`,
    `Objetivo: ${OBJECTIVE_LABELS[input.objective]}`,
    `Formato: ${input.format}`,
    `Tema do post: ${input.theme}`,
  ].join('\n');

  return {
    system,
    user,
  };
}

export function buildImagePrompt(input: {
  theme: string;
  artStyle: ArtStyle;
  brand: BrandSnapshot;
  format: PostFormat;
}): string {
  const ratio =
    input.format === 'story'
      ? 'vertical 9:16'
      : input.format === 'carousel'
        ? 'portrait 4:5'
        : 'square 1:1';
  return [
    `Create a ${ratio} background image for a laundry social post.`,
    `Scene mood, without spelling it: ${input.theme}`,
    `Visual style: ${ART_STYLE_PROMPTS[input.artStyle]}.`,
    `Color inspiration only, never as printed swatches or hex codes: ${input.brand.primaryColor}, ${input.brand.deepColor}, ${input.brand.accentColor}.`,
    'Leave open space in the lower half for a headline that will be composited later in code.',
    'ABSOLUTE RULES: no text, no letters, no numbers, no words, no logo, no watermark, no typography, no signage, no captions, no brand name.',
  ].join(' ');
}

export function buildRewriteMessages(input: {
  companyName: string;
  brand: BrandSnapshot;
  theme: string;
  headline: string;
  length: CaptionLength;
}) {
  const limit =
    input.length === 'short' ? 140 : input.length === 'medium' ? 320 : 700;
  const tones = input.brand.tones.join(', ') || 'Próximo';
  return {
    system: [
      'Reescreva uma legenda de Instagram para uma lavanderia.',
      `Responda apenas o texto da legenda, em português do Brasil, tom ${tones}.`,
      `No máximo ${limit} caracteres.`,
      'Não use aspas em volta. Pode sugerir uma frase de ação.',
      input.brand.voiceNotes ? `Notas de voz: ${input.brand.voiceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    user: `Marca: ${input.companyName}\nTema: ${input.theme}\nTítulo do post: ${input.headline}`,
  };
}

export function parseGenerationJson(
  raw: string,
  count: number,
): GeneratedCopy[] {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('JSON ausente');
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as {
    variations?: Array<Partial<GeneratedCopy>>;
  };
  const variations = Array.isArray(parsed.variations) ? parsed.variations : [];
  if (!variations.length) throw new Error('sem variações');

  const normalized = variations
    .slice(0, count)
    .map((item, index) => normalizeCopy(item, index));
  while (normalized.length < count) {
    const seed = normalized[normalized.length % Math.max(normalized.length, 1)];
    normalized.push({
      ...seed,
      headline: seed.headline,
    });
  }
  return normalized;
}

function normalizeCopy(
  item: Partial<GeneratedCopy>,
  index: number,
): GeneratedCopy {
  const headline = cleanLine(item.headline) || `Novidade da casa ${index + 1}`;
  const hashtags = Array.isArray(item.hashtags)
    ? item.hashtags
        .map((tag) => String(tag).trim())
        .filter((tag) => tag.startsWith('#'))
        .slice(0, 30)
    : [];
  return {
    headline: headline.slice(0, 120),
    badgeText: cleanLine(item.badgeText).slice(0, 40),
    captionShort: cleanBlock(item.captionShort).slice(0, 180),
    captionMedium: cleanBlock(item.captionMedium).slice(0, 400),
    captionLong: cleanBlock(item.captionLong).slice(0, 800),
    hashtags,
  };
}

function asText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean') {
    return String(value);
  }
  return '';
}

function cleanLine(value: unknown): string {
  return asText(value).replace(/\s+/g, ' ').trim();
}

function cleanBlock(value: unknown): string {
  return asText(value).trim();
}
