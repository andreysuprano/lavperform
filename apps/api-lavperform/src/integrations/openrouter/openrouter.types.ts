export const DEFAULT_TEXT_MODEL = 'google/gemini-2.5-flash';
export const DEFAULT_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
export const OPENROUTER_CHAT_URL =
  'https://openrouter.ai/api/v1/chat/completions';

export type OpenRouterMessage = {
  role: 'system' | 'user' | 'assistant';
  content: string;
};

export function extractTextContent(payload: unknown): string {
  const message = (
    payload as { choices?: Array<{ message?: { content?: unknown } }> }
  )?.choices?.[0]?.message;
  const content = message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (!part || typeof part !== 'object' || !('text' in part)) return '';
        const text = (part as { text?: unknown }).text;
        return typeof text === 'string' ? text : '';
      })
      .join('\n')
      .trim();
  }
  return '';
}

export function extractImageDataUrl(payload: unknown): string | null {
  const message = (
    payload as {
      choices?: Array<{
        message?: {
          images?: unknown;
          content?: unknown;
        };
      }>;
    }
  )?.choices?.[0]?.message;
  if (!message) return null;

  const fromImages = readImageUrl(message.images);
  if (fromImages) return fromImages;

  if (Array.isArray(message.content)) {
    const fromParts = readImageUrl(message.content);
    if (fromParts) return fromParts;
  }

  if (typeof message.content === 'string') {
    const match = message.content.match(
      /data:image\/[a-zA-Z0-9.+-]+;base64,[A-Za-z0-9+/=\s]+/,
    );
    if (match) return match[0].replace(/\s/g, '');
  }

  return null;
}

function readImageUrl(value: unknown): string | null {
  if (!Array.isArray(value)) return null;
  for (const item of value) {
    if (!item || typeof item !== 'object') continue;
    const record = item as Record<string, unknown>;
    const nested = record.image_url ?? record.imageUrl;
    if (nested && typeof nested === 'object') {
      const url = (nested as { url?: unknown }).url;
      if (typeof url === 'string' && url.startsWith('data:image')) return url;
    }
    if (typeof record.url === 'string' && record.url.startsWith('data:image')) {
      return record.url;
    }
  }
  return null;
}
