/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { buildComposedLayers } from 'src/social-posts/domain/post-layers';
import {
  buildCopyMessages,
  buildImagePrompt,
  parseGenerationJson,
} from 'src/social-posts/domain/prompts';
import { DEFAULT_BRAND } from 'src/social-posts/domain/social-post.types';
import { SocialPostsService } from 'src/social-posts/social-posts.service';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('geração de posts', () => {
  it('compõe a arte inteira e tira hashtag da legenda', () => {
    const calm = buildImagePrompt({
      theme: 'desconto na lavagem de edredom',
      artStyle: 'fotografico_clean',
      brand: DEFAULT_BRAND,
      format: 'feed',
      companyName: 'Bolha Azul',
      objective: 'promocao',
      headline: 'Edredom novo de novo.',
      badgeText: '20% OFF',
      tone: 'Amigável',
      mediaCount: 1,
      variationIndex: 0,
      creativeFreedom: false,
    });
    const bold = buildImagePrompt({
      theme: 'desconto na lavagem de edredom',
      artStyle: 'fotografico_clean',
      brand: DEFAULT_BRAND,
      format: 'feed',
      headline: 'Edredom novo de novo.',
      mediaCount: 1,
      variationIndex: 1,
      creativeFreedom: true,
    });
    expect(calm).toMatch(/Edredom novo de novo/);
    expect(calm).toMatch(/MUST appear|must appear/i);
    expect(calm).toMatch(/Stay on brand/i);
    expect(calm).not.toMatch(/no text/i);
    expect(calm).not.toMatch(/Leave open space in the lower half/);
    expect(bold).toMatch(/Creative freedom is ON/i);
    expect(bold).not.toBe(calm);
    const messages = buildCopyMessages({
      companyName: 'Bolha Azul',
      brand: DEFAULT_BRAND,
      objective: 'promocao',
      theme: 'desconto',
      format: 'feed',
      count: 4,
      includeCaption: true,
    });
    expect(messages.system).toMatch(/proibido usar hashtag/i);
    expect(messages.system).not.toMatch(/hashtags:/i);

    const [copy] = parseGenerationJson(
      JSON.stringify({
        variations: [
          {
            headline: 'Edredom novo #sexta',
            badgeText: '20% OFF',
            captionShort: 'curta #lavar',
            captionMedium: 'média #edredom',
            captionLong: 'longa',
            hashtags: ['#lavanderia'],
          },
        ],
      }),
      1,
    );
    expect(copy.headline).toBe('Edredom novo');
    expect(copy.captionShort).not.toMatch(/#/);
    expect(copy.captionMedium).not.toMatch(/#/);
    expect(copy.hashtags).toEqual([]);
    expect(buildComposedLayers().map((layer) => layer.type)).toEqual([
      'background',
    ]);
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
    expect(prompts[0]).toContain('Titulo 1');
    expect(prompts[0]).not.toMatch(/no text/i);
    expect(prompts[0]).not.toBe(prompts[1]);
    expect(prompts.join(' ')).not.toMatch(/#lavanderia/);
    expect(openRouter.generateImage.mock.calls[0][3]).toEqual({
      compose: true,
    });
    expect(result.variations).toHaveLength(4);
    expect(result.variations[0].slides[0].backgroundImage).toBe(TINY);
    expect(result.variations[0].slides[0].layers).toEqual([
      expect.objectContaining({ type: 'background' }),
    ]);
    expect(result.variations[0].headline).toBe('Titulo 1');
    expect(result.variations[0].captionMedium).toBe('media 1');
    expect(result.selectedVariationId).toBe('var-0');
  });
});
