import type { PostFormat } from '../../social-posts/domain/social-post.types';
import type { FalCatalogModel } from './fal.catalog';
import { normalizeReferenceImages } from './reference-images';

export type FalRequestPlan = {
  endpointId: string;
  body: Record<string, unknown>;
  referencesUsed: number;
  referencesIgnored: boolean;
  notice: string | null;
};

export function buildFalRequest(
  model: Pick<
    FalCatalogModel,
    'endpointId' | 'sizeMode' | 'referenceEndpoint' | 'referenceField'
  >,
  prompt: string,
  format: PostFormat,
  options?: { example?: boolean; referenceImages?: string[] },
): FalRequestPlan {
  const example = options?.example === true;
  const references = example
    ? []
    : normalizeReferenceImages(options?.referenceImages);
  const body = sizeBody(model, prompt, format, example);
  if (!references.length || !model.referenceEndpoint || !model.referenceField) {
    return {
      endpointId: model.endpointId,
      body,
      referencesUsed: 0,
      referencesIgnored: references.length > 0,
      notice:
        references.length > 0
          ? 'Este modelo não usa imagens de referência. O fundo foi gerado sem elas.'
          : null,
    };
  }
  if (model.referenceField === 'image_urls') {
    body.image_urls = references;
    return {
      endpointId: model.referenceEndpoint,
      body,
      referencesUsed: references.length,
      referencesIgnored: false,
      notice: null,
    };
  }
  body.image_url = references[0];
  return {
    endpointId: model.referenceEndpoint,
    body,
    referencesUsed: 1,
    referencesIgnored: false,
    notice:
      references.length > 1
        ? 'Este modelo usa só a primeira imagem de referência.'
        : null,
  };
}

function sizeBody(
  model: Pick<FalCatalogModel, 'sizeMode'>,
  prompt: string,
  format: PostFormat,
  example: boolean,
): Record<string, unknown> {
  const body: Record<string, unknown> = { prompt, num_images: 1 };
  if (model.sizeMode === 'aspect_ratio') {
    body.aspect_ratio = example
      ? '1:1'
      : format === 'story'
        ? '9:16'
        : format === 'carousel'
          ? '3:4'
          : '1:1';
    return body;
  }
  if (example || format === 'feed') {
    body.image_size = example ? 'square' : 'square_hd';
    return body;
  }
  if (format === 'story') {
    body.image_size = 'portrait_16_9';
    return body;
  }
  body.image_size = { width: 1024, height: 1280 };
  return body;
}
