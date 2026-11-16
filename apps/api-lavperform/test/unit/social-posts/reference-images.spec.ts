/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
import { BadRequestException, NotFoundException } from '@nestjs/common';
import {
  parseReferenceDataUrl,
  referenceLimitMessage,
} from 'src/social-posts/domain/reference-image';
import { SocialPostsService } from 'src/social-posts/social-posts.service';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('imagens de referência', () => {
  it('rejeita tipo inválido, arquivo vazio e arquivo grande', () => {
    expect(() => parseReferenceDataUrl('data:text/plain;base64,YQ==')).toThrow(
      BadRequestException,
    );
    expect(() =>
      parseReferenceDataUrl('data:image/gif;base64,R0lGOD0='),
    ).toThrow(/JPG, PNG ou WEBP/);
    expect(() => parseReferenceDataUrl('data:image/png;base64,Y')).toThrow(
      /não conseguimos ler/i,
    );
    const huge = 'A'.repeat(14_000_000);
    expect(() =>
      parseReferenceDataUrl(`data:image/jpeg;base64,${huge}`),
    ).toThrow(/10 MB/);
    expect(referenceLimitMessage()).toBe('Limite de 5 imagens');
  });

  it('isola a imagem por empresa e bloqueia a sexta', async () => {
    const companyA = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
    const companyB = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
    const rows: any[] = [];
    const prisma: any = {
      userCompany: {
        findUnique: jest.fn(async ({ where }) =>
          where.userId_companyId.companyId === companyA &&
          where.userId_companyId.userId === 'user-a'
            ? { id: 'link' }
            : where.userId_companyId.companyId === companyB &&
                where.userId_companyId.userId === 'user-b'
              ? { id: 'link-b' }
              : null,
        ),
      },
      socialPostReference: {
        count: jest.fn(
          async () => rows.filter((item) => !item.removedAt).length,
        ),
        create: jest.fn(async ({ data }) => {
          const row = {
            ...data,
            id: `ref-${rows.length + 1}`,
            removedAt: null,
          };
          rows.push(row);
          return row;
        }),
        findUnique: jest.fn(
          async ({ where }) =>
            rows.find((item) => item.id === where.id) ?? null,
        ),
        findMany: jest.fn(async () => rows),
        update: jest.fn(),
      },
    };
    const service = new SocialPostsService(prisma, {
      referenceCapability: jest.fn(),
      generateImage: jest.fn(),
    } as any);

    const saved = await service.addReference('user-a', companyA, TINY);
    await expect(
      service.getReference('user-b', saved.id),
    ).rejects.toBeInstanceOf(NotFoundException);
    await expect(
      service.getReference('user-a', saved.id),
    ).resolves.toMatchObject({
      id: saved.id,
    });

    prisma.socialPostReference.count.mockResolvedValue(5);
    await expect(
      service.addReference('user-a', companyA, TINY),
    ).rejects.toThrow(/Limite de 5 imagens/);
  });

  it('troca o modelo só do rascunho quando o ativo não aceita imagem', async () => {
    const companyId = '11111111-1111-4111-8111-111111111111';
    const draftId = '33333333-3333-4333-8333-333333333333';
    const refs = [
      {
        id: 'ref-1',
        draftId,
        dataUrl: TINY,
        position: 0,
        removedAt: null,
      },
    ];
    const draft: any = {
      id: draftId,
      companyId,
      objective: 'promocao',
      theme: 'desconto na lavagem de edredom no Batel',
      format: 'feed',
      slideCount: 1,
      artStyle: 'fotografico_clean',
      includeCaption: true,
      imageModel: 'google/gemini-2.5-flash-image',
      selectedVariationId: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      variations: [],
      references: refs,
    };
    const prisma: any = {
      userCompany: { findUnique: jest.fn().mockResolvedValue({ id: 'link' }) },
      company: { findUnique: jest.fn().mockResolvedValue({ name: 'Bolha' }) },
      brandIdentity: { findUnique: jest.fn().mockResolvedValue(null) },
      socialPostDraft: {
        findUnique: jest.fn(async () => ({
          ...draft,
          variations: draft.variations,
        })),
        update: jest.fn(async ({ data }) => Object.assign(draft, data)),
      },
      socialPostReference: {
        findMany: jest.fn(async () => refs),
      },
      socialPostVariation: {
        deleteMany: jest.fn(async () => {
          draft.variations = [];
        }),
        create: jest.fn(async ({ data }) => {
          const row = { ...data, id: 'var-1', versions: [] };
          draft.variations.push(row);
          return row;
        }),
        update: jest.fn(async ({ data }) =>
          Object.assign(draft.variations[0], data),
        ),
      },
      socialPostVersion: {
        create: jest.fn(async ({ data }) => {
          const version = { ...data, id: 'ver-1' };
          draft.variations[0].versions.push(version);
          return version;
        }),
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(prisma),
    };
    const openRouter = {
      referenceCapability: jest.fn(async (model?: string) =>
        model === 'google/gemini-2.5-flash-image'
          ? { accepts: true, suggestion: null }
          : { accepts: false, suggestion: 'google/gemini-2.5-flash-image' },
      ),
      imageModel: () => 'vendor/text-only',
      completeText: jest.fn().mockResolvedValue(
        JSON.stringify({
          variations: [1, 2, 3, 4].map((index) => ({
            headline: `Titulo ${index}`,
            badgeText: '20% OFF',
            captionShort: 'c',
            captionMedium: 'm',
            captionLong: 'l',
            hashtags: ['#lavanderia'],
          })),
        }),
      ),
      generateImage: jest.fn().mockResolvedValue(TINY),
    };
    const service = new SocialPostsService(prisma, openRouter as any);
    await expect(service.imageModelStatus()).resolves.toMatchObject({
      model: 'vendor/text-only',
      acceptsImages: false,
      suggestion: 'google/gemini-2.5-flash-image',
    });
    await service.generate('user-a', draftId);
    expect(openRouter.generateImage).toHaveBeenCalled();
    expect(openRouter.generateImage.mock.calls[0][1]).toEqual([
      { url: TINY, role: 'media' },
    ]);
    expect(String(openRouter.generateImage.mock.calls[0][0])).toMatch(
      /MUST appear|must appear/i,
    );
    expect(openRouter.generateImage.mock.calls[0][2]).toBe(
      'google/gemini-2.5-flash-image',
    );
    expect(openRouter.generateImage.mock.calls[0][3]).toEqual({
      compose: true,
    });
    expect(draft.variations[0].versions[0].referenceIds).toEqual(['ref-1']);
  });
});
