import { BadRequestException } from '@nestjs/common';

const MAX_BYTES = 10 * 1024 * 1024;
const DATA_URL = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/;

export function parseReferenceDataUrl(value: string): {
  mimeType: string;
  bytes: number;
} {
  const match = DATA_URL.exec(value.trim());
  if (!match) {
    throw new BadRequestException('Envie JPG, PNG ou WEBP.');
  }
  const payload = match[2].replace(/\s/g, '');
  if (payload.length < 16 || payload.length % 4 === 1) {
    throw new BadRequestException(
      'Não conseguimos ler esta imagem. Tente outra.',
    );
  }
  const bytes = Buffer.from(payload, 'base64').length;
  if (!bytes) {
    throw new BadRequestException(
      'Não conseguimos ler esta imagem. Tente outra.',
    );
  }
  if (bytes > MAX_BYTES) {
    throw new BadRequestException('Cada imagem pode ter no máximo 10 MB.');
  }
  return { mimeType: match[1], bytes };
}

export const REFERENCE_LIMIT = 5;
export const MEDIA_LIMIT = 10;

export function referenceLimitMessage() {
  return 'Limite de 5 imagens';
}
