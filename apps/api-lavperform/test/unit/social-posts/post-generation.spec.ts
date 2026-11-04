/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { buildDefaultLayers } from 'src/social-posts/domain/post-layers';
import {
  buildImagePrompt,
  parseGenerationJson,
} from 'src/social-posts/domain/prompts';
import { DEFAULT_BRAND } from 'src/social-posts/domain/social-post.types';
import { SocialPostsService } from 'src/social-posts/social-posts.service';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('geração de posts', () => {
  it('pede fundo sem texto e monta o título como camada', () => {
    const prompt = buildImagePrompt({
      theme: 'desconto na lavagem de edredom',
      artStyle: 'fotografico_clean',
      brand: DEFAULT_BRAND,
      format: 'feed',
    });
    expect(prompt).toMatch(/no text/i);
    expect(prompt).toMatch(/no logo/i);
    expect(prompt).not.toMatch(/Edredom novo/);

    const [copy] = parseGenerationJson(
      JSON.stringify({
        variations: [
          {
            headline: 'Edredom novo de novo.',
            badgeText: '20% OFF',
            captionShort: 'curta',
            captionMedium: 'média',
            captionLong: 'longa',
            hashtags: ['#lavanderia'],
          },
        ],
      }),
      1,
    );
    const layers = buildDefaultLayers(DEFAULT_BRAND, copy);
    expect(layers.find((layer) => layer.type === 'title')?.text).toBe(
      'Edredom novo de novo.',
    );
    expect(layers.find((layer) => layer.type === 'background')?.locked).toBe(
      true,
    );
  });

  it('separa imagem de fundo e camadas de texto no rascunho', async () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const userId = '22222222-2222-4222-8222-222222222222';
    const draftId = '33333333-3333-4333-8333-333333333333';
    let variations: any[] = [];
    let selected: string | null = null;
    const draft = {
      id: draftId,
      companyId,
      objective: 'promocao',
      theme: 'desconto na lavagem de edredom no Batel',
      format: 'feed',
      slideCount: 1,
      artStyle: 'fotografico_clean',
      includeCaption: true,
      get selectedVariationId() {
        return selected;
      },
      set selectedVariationId(value: string | null) {
        selected = value;
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      get variations() {
        return variations;
      },
    };

    const prisma: any = {
      userCompany: { findUnique: jest.fn().mockResolvedValue({ id: 'link' }) },
      company: {
        findUnique: jest.fn().mockResolvedValue({ name: 'Bolha Azul' }),
      },
      brandIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
      socialPostDraft: {
        findUnique: jest.fn(async () => ({ ...draft, variations })),
        update: jest.fn(async ({ data }) => {
          selected = data.selectedVariationId;
          return draft;
        }),
      },
      socialPostVariation: {
        deleteMany: jest.fn(async () => {
          variations = [];
        }),
        create: jest.fn(async ({ data }) => {
          const row = { ...data, id: `var-${variations.length}`, versions: [] };
          variations.push(row);
          return row;
        }),
        update: jest.fn(async ({ where, data }) => {
          const row = variations.find((item) => item.id === where.id);
          Object.assign(row, data);
          return row;
        }),
      },
      socialPostVersion: {
        create: jest.fn(async ({ data }) => {
          const row = variations.find((item) => item.id === data.variationId);
          const version = {
            ...data,
            id: `ver-${data.variationId}-${data.number}`,
          };
          row.versions.push(version);
          return version;
        }),
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(prisma),
    };
    prisma.socialPostDraft.findUnique.mockImplementation(async () => ({
      ...draft,
      selectedVariationId: selected,
      variations,
    }));

    const prompts: string[] = [];
    const openRouter: any = {
      completeText: jest.fn().mockResolvedValue(
        JSON.stringify({
          variations: [1, 2, 3, 4].map((index) => ({
            headline: `Titulo ${index}`,
            badgeText: '20% OFF',
            captionShort: `curta ${index}`,
            captionMedium: `media ${index}`,
            captionLong: `longa ${index}`,
            hashtags: ['#lavanderia'],
          })),
        }),
      ),
      generateImage: jest.fn(async (prompt: string) => {
        prompts.push(prompt);
        return TINY;
      }),
    };

    const service = new SocialPostsService(prisma, openRouter);
    const result = await service.generate(userId, draftId);

    expect(openRouter.generateImage).toHaveBeenCalledTimes(4);
    expect(prompts.every((prompt) => /no text/i.test(prompt))).toBe(true);
    expect(prompts.join(' ')).not.toContain('Titulo 1');
    expect(result.variations).toHaveLength(4);
    expect(result.variations[0].slides[0].backgroundImage).toBe(TINY);
    expect(
      result.variations[0].slides[0].layers.find(
        (layer) => layer.type === 'title',
      )?.text,
    ).toBe('Titulo 1');
    expect(result.selectedVariationId).toBe('var-0');
  });
});
