import type { PostLayer, PostSlide } from './social-post.types';

export interface RevisionPlan {
  nonsense: boolean;
  regenerateBackground: boolean;
  backgroundInstruction: string;
  headline: string | null;
  badgeText: string | null;
  captionShort: string | null;
  captionMedium: string | null;
  captionLong: string | null;
  hashtags: string[] | null;
  reply: string;
}

export function isUselessPrompt(prompt: string): boolean {
  const text = prompt.trim();
  if (text.length < 3) return true;
  return !/[a-zA-ZÀ-ÿ]{2,}/.test(text);
}

export function parseRevisionPlan(raw: string): RevisionPlan {
  const start = raw.indexOf('{');
  const end = raw.lastIndexOf('}');
  if (start < 0 || end <= start) {
    throw new Error('JSON ausente');
  }
  const parsed = JSON.parse(raw.slice(start, end + 1)) as Partial<RevisionPlan>;
  const regenerateBackground = parsed.regenerateBackground === true;
  const headline = optionalText(parsed.headline);
  const captionTouched = ['captionShort', 'captionMedium', 'captionLong'].some(
    (key) => optionalText(parsed[key as keyof RevisionPlan]) != null,
  );
  return {
    nonsense: parsed.nonsense === true,
    regenerateBackground,
    backgroundInstruction: optionalText(parsed.backgroundInstruction) ?? '',
    headline,
    badgeText: optionalText(parsed.badgeText),
    captionShort: optionalText(parsed.captionShort),
    captionMedium: optionalText(parsed.captionMedium),
    captionLong: optionalText(parsed.captionLong),
    hashtags: Array.isArray(parsed.hashtags)
      ? parsed.hashtags
          .map((tag) => String(tag))
          .filter((tag) => tag.startsWith('#'))
      : null,
    reply:
      optionalText(parsed.reply) ??
      defaultReply({ regenerateBackground, headline, captionTouched }),
  };
}

export function describeRevision(input: {
  backgroundChanged: boolean;
  headlineBefore: string;
  headlineAfter: string;
  captionBefore: string;
  captionAfter: string;
  badgeBefore: string | null;
  badgeAfter: string | null;
  hashtagsBefore?: string[];
  hashtagsAfter?: string[];
}): string {
  const sentences: string[] = [];
  if (input.backgroundChanged) sentences.push('Mudei o fundo.');
  if (input.headlineAfter.trim() !== input.headlineBefore.trim()) {
    sentences.push('Atualizei o título.');
  }
  const before = input.captionBefore.trim();
  const after = input.captionAfter.trim();
  if (after !== before) {
    sentences.push(
      after.length < before.length
        ? 'Encurtei a legenda.'
        : 'Atualizei a legenda.',
    );
  }
  if ((input.badgeAfter ?? '').trim() !== (input.badgeBefore ?? '').trim()) {
    sentences.push('Atualizei o selo.');
  }
  if (
    (input.hashtagsBefore ?? []).join('\n') !==
    (input.hashtagsAfter ?? input.hashtagsBefore ?? []).join('\n')
  ) {
    sentences.push('Atualizei as hashtags.');
  }
  return sentences.length ? sentences.join(' ') : 'Mantive o post como estava.';
}

export function applyRevisionToSlides(
  slides: PostSlide[],
  plan: Pick<RevisionPlan, 'headline' | 'badgeText'>,
  newBackground: string | null,
): PostSlide[] {
  return slides.map((slide) => ({
    backgroundImage: newBackground ?? slide.backgroundImage,
    layers: slide.layers.map((layer) => updateLayer(layer, plan)),
  }));
}

function updateLayer(
  layer: PostLayer,
  plan: Pick<RevisionPlan, 'headline' | 'badgeText'>,
): PostLayer {
  if (layer.type === 'title' && plan.headline) {
    return { ...layer, text: plan.headline };
  }
  if (layer.type === 'badge' && plan.badgeText) {
    return { ...layer, text: plan.badgeText };
  }
  return { ...layer };
}

function optionalText(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

function defaultReply(input: {
  regenerateBackground: boolean;
  headline: string | null;
  captionTouched: boolean;
}): string {
  const parts: string[] = [];
  if (input.regenerateBackground) parts.push('o fundo');
  if (input.headline) parts.push('o título');
  if (input.captionTouched) parts.push('a legenda');
  if (!parts.length) return 'Atualizei o post.';
  if (parts.length === 1 && input.regenerateBackground) return 'Mudei o fundo.';
  return `Atualizei ${parts.join(' e ')}.`;
}
