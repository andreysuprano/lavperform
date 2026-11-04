import { BadRequestException } from '@nestjs/common';
import {
  applyRevisionToSlides,
  isUselessPrompt,
  parseRevisionPlan,
} from 'src/social-posts/domain/revision';
import { SocialPostsService } from 'src/social-posts/social-posts.service';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
const NEXT =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

describe('revisão de post', () => {
  it('recusa pedido vazio ou sem sentido óbvio antes de chamar o modelo', () => {
    expect(isUselessPrompt('')).toBe(true);
    expect(isUselessPrompt('??')).toBe(true);
    expect(isUselessPrompt('12345')).toBe(true);
    expect(isUselessPrompt('fundo mais claro')).toBe(false);
  });

  it('troca só o texto do título e preserva o fundo', () => {
    const plan = parseRevisionPlan(
      JSON.stringify({
        nonsense: false,
        regenerateBackground: false,
        headline: 'Coleta grátis hoje',
        reply: 'Atualizei o título.',
      }),
    );
    const slides = applyRevisionToSlides(
      [
        {
          backgroundImage: TINY,
          layers: [
            {
              id: 'title',
              type: 'title',
              label: 'Título',
              text: 'Título antigo',
              x: 50,
              y: 60,
              locked: false,
              visible: true,
            },
          ],
        },
      ],
      plan,
      null,
    );
    expect(slides[0].backgroundImage).toBe(TINY);
    expect(slides[0].layers[0].text).toBe('Coleta grátis hoje');
  });

  it('no serviço, título não gera imagem e fundo gera só o background', async () => {
    const variationId = '44444444-4444-4444-8444-444444444444';
    const versions: any[] = [
      {
        id: 'ver-1',
        number: 1,
        source: 'generation',
        prompt: null,
        assistantReply: 'Versão inicial pronta.',
        headline: 'Título antigo',
        badgeText: null,
        captionShort: 'curta',
        captionMedium: 'legenda média',
        captionLong: 'longa',
        activeCaption: 'medium',
        hashtags: ['#lavanderia'],
        slides: [
          {
            backgroundImage: TINY,
            layers: [
              {
                id: 'title',
                type: 'title',
                label: 'Título',
                text: 'Título antigo',
                x: 1,
                y: 1,
                locked: false,
                visible: true,
              },
            ],
          },
        ],
        createdAt: new Date(),
      },
    ];
    const variation: any = {
      id: variationId,
      draftId: 'draft-1',
      headline: 'Título antigo',
      badgeText: null,
      captionShort: 'curta',
      captionMedium: 'legenda média',
      captionLong: 'longa',
      activeCaption: 'medium',
      hashtags: ['#lavanderia'],
      slides: versions[0].slides,
      selectedVersionId: 'ver-1',
      versions,
      draft: {
        id: 'draft-1',
        companyId: '11111111-1111-4111-8111-111111111111',
        theme: 'edredom',
        artStyle: 'fotografico_clean',
        format: 'feed',
      },
    };
    const prisma: any = {
      userCompany: { findUnique: jest.fn().mockResolvedValue({ id: 'link' }) },
      company: { findUnique: jest.fn().mockResolvedValue({ name: 'Bolha' }) },
      brandIdentity: {
        findUnique: jest.fn().mockResolvedValue({
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
        }),
      },
      socialPostVariation: {
        findUnique: jest.fn(async () => variation),
        update: jest.fn(async ({ data }) => Object.assign(variation, data)),
      },
      socialPostVersion: {
        findFirst: jest.fn(async () => versions[versions.length - 1]),
        create: jest.fn(async ({ data }) => {
          const created = {
            ...data,
            id: `ver-${data.number}`,
            createdAt: new Date(),
          };
          versions.push(created);
          return created;
        }),
      },
      socialPostDraft: {
        findUnique: jest.fn(async () => ({
          id: 'draft-1',
          companyId: variation.draft.companyId,
          objective: 'promocao',
          theme: 'edredom',
          format: 'feed',
          slideCount: 1,
          artStyle: 'fotografico_clean',
          includeCaption: true,
          selectedVariationId: variationId,
          createdAt: new Date(),
          updatedAt: new Date(),
          variations: [variation],
        })),
      },
      $transaction: async (fn: (tx: any) => Promise<unknown>) => fn(prisma),
    };
    const openRouter: any = {
      completeText: jest.fn(),
      generateImage: jest.fn().mockResolvedValue(NEXT),
    };
    const service = new SocialPostsService(prisma, openRouter);

    openRouter.completeText.mockResolvedValueOnce(
      JSON.stringify({
        nonsense: false,
        regenerateBackground: false,
        headline: 'Coleta grátis hoje',
        reply: 'Atualizei o título.',
      }),
    );
    const titled = await service.revise('user-1', variationId, 'troca o título');
    expect(openRouter.generateImage).not.toHaveBeenCalled();
    expect(titled.variations[0].versions).toHaveLength(2);
    expect(titled.variations[0].slides[0].backgroundImage).toBe(TINY);
    expect(titled.variations[0].slides[0].layers[0].text).toBe('Coleta grátis hoje');

    openRouter.completeText.mockResolvedValueOnce(
      JSON.stringify({
        nonsense: false,
        regenerateBackground: true,
        backgroundInstruction: 'lighter laundry room',
        reply: 'Mudei o fundo.',
      }),
    );
    const background = await service.revise('user-1', variationId, 'fundo mais claro');
    expect(openRouter.generateImage).toHaveBeenCalledTimes(1);
    expect(String(openRouter.generateImage.mock.calls[0][0])).toMatch(/no text/i);
    expect(background.variations[0].versions).toHaveLength(3);
    expect(background.variations[0].slides[0].backgroundImage).toBe(NEXT);
    expect(background.variations[0].versions[0].id).toBe('ver-1');

    await expect(service.revise('user-1', variationId, '???')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(versions).toHaveLength(3);

    openRouter.completeText.mockImplementation(async (messages: Array<{ role: string; content: string }>) => {
      const user = messages.find((item) => item.role === 'user')?.content ?? '';
      await new Promise((resolve) => setTimeout(resolve, 15));
      if (/fundo/i.test(user)) {
        return JSON.stringify({
          nonsense: false,
          regenerateBackground: true,
          backgroundInstruction: 'lighter',
          reply: 'Mudei o fundo.',
        });
      }
      return JSON.stringify({
        nonsense: false,
        regenerateBackground: false,
        headline: 'Outro título',
        reply: 'Atualizei o título.',
      });
    });
    await Promise.all([
      service.revise('user-1', variationId, 'fundo mais claro outra vez'),
      service.revise('user-1', variationId, 'troca o título outra vez'),
    ]);
    expect(versions.map((item) => item.number)).toEqual([1, 2, 3, 4, 5]);
    expect(versions[0].slides[0].backgroundImage).toBe(TINY);
  });
});
