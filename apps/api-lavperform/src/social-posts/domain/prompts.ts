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

const COPY_SHAPE = `{"variations":[{"headline":"","badgeText":"","captionShort":"","captionMedium":"","captionLong":""}]}`;

const COMPOSITIONS = [
  'Editorial split: photo on one side, a solid brand-color panel on the other, headline inside the panel. No full-width bottom gradient.',
  'Poster: oversized headline on top, the photo inside a rounded window, thin diagonal accent. Not a translucent lower band.',
  'Full-bleed photo with the headline on a small colored label. Logo clear of faces and clothes.',
  'Asymmetric collage: overlapping frames, a slightly rotated offer stamp, headline stacked on the left.',
  'Ticket card: thick border in the deep brand color, photo inside, headline centered, offer as a stamp.',
  'Stacked blocks with generous margins: hero photo, headline, then a small offer chip.',
];

export function buildCopyMessages(input: {
  companyName: string;
  brand: BrandSnapshot;
  objective: PostObjective;
  theme: string;
  format: PostFormat;
  count: number;
  includeCaption: boolean;
  creativeFreedom?: boolean;
  tone?: string | null;
}) {
  const tones = input.tone?.trim()
    ? input.tone.trim()
    : input.brand.tones.length
      ? input.brand.tones.join(', ')
      : 'Amigável';
  const system = [
    'Você escreve posts de redes sociais para lavanderias no Brasil.',
    'Responda apenas JSON válido, sem markdown, neste formato:',
    COPY_SHAPE,
    `Gere exatamente ${input.count} variações, cada uma com um ângulo diferente.`,
    'headline: até 8 palavras, sem emoji.',
    'badgeText: selo curto de oferta ou vazio.',
    'captionShort até 140 caracteres, captionMedium até 320, captionLong até 700.',
    'Proibido usar hashtag. Nenhuma palavra pode começar com #. Não sugira hashtags na legenda, no título ou no selo.',
    `Tom de voz deste post: ${tones}.`,
    input.brand.voiceNotes
      ? `Notas de voz da marca: ${input.brand.voiceNotes}`
      : '',
    input.brand.references
      ? `Referências da marca (não copie literalmente): ${input.brand.references}`
      : '',
    input.includeCaption
      ? 'Preencha as três legendas, só com texto corrido.'
      : 'Deixe captionShort, captionMedium e captionLong como string vazia.',
    input.creativeFreedom
      ? 'Liberdade criativa ligada: varie a metáfora e a estrutura, sem sair da marca e sem hashtag.'
      : 'Siga o tema de perto. Não invente preço, prazo ou promoção que não estejam no pedido.',
    'O título e o selo serão desenhados dentro da imagem. Escreva as palavras exatas.',
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
  companyName?: string;
  objective?: PostObjective;
  headline?: string;
  badgeText?: string;
  caption?: string;
  tone?: string | null;
  creativeFreedom?: boolean;
  variationIndex?: number;
  logoCount?: number;
  mediaCount?: number;
}): string {
  const shape = String(input.format);
  const ratio =
    shape === 'story'
      ? 'vertical 9:16'
      : shape === 'carousel'
        ? 'portrait 4:5'
        : shape === 'google'
          ? 'landscape 4:3'
          : 'square 1:1';
  const layout =
    COMPOSITIONS[(input.variationIndex ?? 0) % COMPOSITIONS.length];
  const objective = input.objective
    ? OBJECTIVE_LABELS[input.objective]
    : 'Post da lavanderia';
  const freedom = input.creativeFreedom
    ? 'Creative freedom is ON. You may crop the store photos, recolor them to fit the palette and invent a background. The real subject of each store photo must stay recognizable. Bold layout is welcome. Keep the logo readable and the brand colors present.'
    : 'Stay on brand. Use only this palette, these fonts and a clear logo. Show store photos without heavy crops or recoloring. The layout must still differ from a repeated bottom color band.';
  return [
    `Design one finished ${ratio} social post. Compose layout, typography, shapes and imagery yourself. Do not leave an empty band for a later text overlay.`,
    `Brand: ${input.companyName || 'Lavanderia'}.`,
    `Objective: ${objective}.`,
    `Theme: ${input.theme}.`,
    `Voice: ${input.tone?.trim() || input.brand.tones.join(', ') || 'warm and close'}.`,
    input.brand.voiceNotes ? `Voice notes: ${input.brand.voiceNotes}.` : '',
    `Palette, never printed as hex codes: primary ${input.brand.primaryColor}, deep ${input.brand.deepColor}, accent ${input.brand.accentColor}, neutral ${input.brand.neutralColor}.`,
    `Typography: headline in ${input.brand.titleFont}, supporting text in ${input.brand.bodyFont}.`,
    `Art direction: ${ART_STYLE_PROMPTS[input.artStyle]}.`,
    `Layout for this option: ${layout}`,
    input.headline
      ? `Render this exact headline in Portuguese: "${input.headline}".`
      : 'Write a short Portuguese headline from the theme and render it.',
    input.badgeText?.trim()
      ? `Render this exact offer badge: "${input.badgeText.trim()}".`
      : 'Do not invent a fake discount.',
    input.caption?.trim()
      ? `Caption context, do not print it and do not add hashtags: ${input.caption.trim()}.`
      : '',
    input.logoCount
      ? 'The attached logo must appear. Do not redraw a different mark.'
      : `No logo file. Set the name "${input.companyName || 'Lavanderia'}" in type.`,
    input.mediaCount
      ? `The ${input.mediaCount} attached store photo(s) MUST appear in the final image, composited and edited into the layout. Show the real laundry, people or place. Do not use them only as style inspiration and do not replace them with another scene.`
      : 'No store photo was provided. Create original imagery for the theme.',
    freedom,
    'Do not add hashtags, watermarks or hex codes.',
  ]
    .filter(Boolean)
    .join(' ');
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
      'Não use hashtag. Nenhuma palavra pode começar com #.',
      'Não use aspas em volta. Pode sugerir uma frase de ação.',
      input.brand.voiceNotes ? `Notas de voz: ${input.brand.voiceNotes}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
    user: `Marca: ${input.companyName}\nTema: ${input.theme}\nTítulo do post: ${input.headline}`,
  };
}

export function buildRevisionMessages(input: {
  theme: string;
  tones: string[];
  headline: string;
  captionMedium: string;
  prompt: string;
}) {
  const tones = input.tones.length ? input.tones.join(', ') : 'Próximo';
  return {
    system: [
      'Você revisa um post de lavanderia já gerado.',
      'Responda apenas JSON válido, sem markdown:',
      '{"nonsense":false,"regenerateBackground":false,"backgroundInstruction":"","headline":null,"badgeText":null,"captionShort":null,"captionMedium":null,"captionLong":null,"reply":""}',
      'Nunca devolva hashtag. Legendas são texto corrido, sem #.',
      'Se o pedido for só mudar o título, regenerateBackground=false e preencha headline. Não descreva imagem nova.',
      'Se o pedido for só o fundo, regenerateBackground=true e backgroundInstruction descreve a cena sem texto, letras, números ou logo. headline e legendas ficam null. reply: "Mudei o fundo. Texto, logo e cores mantidos."',
      `Se o pedido for a legenda, reescreva captionShort, captionMedium e captionLong no tom ${tones}. Não regenere o fundo.`,
      'Pode combinar ações só se o pedido pedir mais de uma coisa.',
      'reply é uma frase curta em português, como "Mudei o fundo" ou "Atualizei o título e a legenda".',
      'Se o pedido for vazio, sem sentido ou não for sobre o post, nonsense=true.',
    ].join('\n'),
    user: [
      `Tema: ${input.theme}`,
      `Título atual: ${input.headline}`,
      `Legenda atual: ${input.captionMedium}`,
      `Pedido: ${input.prompt}`,
    ].join('\n'),
  };
}

export function buildRevisionImagePrompt(
  basePrompt: string,
  instruction: string,
): string {
  return [
    basePrompt,
    `Adjustment requested: ${instruction}.`,
    'Rebuild the whole post so the change is visible. Keep the exact headline and badge text in the image. Keep the logo and any store photos.',
  ].join(' ');
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
  const headline =
    stripHashtags(cleanLine(item.headline)) || `Novidade da casa ${index + 1}`;
  return {
    headline: headline.slice(0, 120),
    badgeText: stripHashtags(cleanLine(item.badgeText)).slice(0, 40),
    captionShort: stripHashtags(cleanBlock(item.captionShort)).slice(0, 180),
    captionMedium: stripHashtags(cleanBlock(item.captionMedium)).slice(0, 400),
    captionLong: stripHashtags(cleanBlock(item.captionLong)).slice(0, 800),
    hashtags: [],
  };
}

export function stripHashtags(value: string): string {
  return value
    .replace(/(^|[\s.,;:!?()[\]"'])#[\p{L}\p{N}_-]+/gu, '$1')
    .replace(/[ \t]{2,}/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
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
