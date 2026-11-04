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
    expect(() => parseReferenceDataUrl('data:image/gif;base64,R0lGOD0=')).toThrow(
      /JPG, PNG ou WEBP/,
    );
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
        count: jest.fn(async () => rows.filter((item) => !item.removedAt).length),
        create: jest.fn(async ({ data }) => {
          const row = { ...data, id: `ref-${rows.length + 1}`, removedAt: null };
          rows.push(row);
          return row;
        }),
        findUnique: jest.fn(async ({ where }) =>
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
    await expect(service.getReference('user-b', saved.id)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    await expect(service.getReference('user-a', saved.id)).resolves.toMatchObject({
      id: saved.id,
    });

    prisma.socialPostReference.count.mockResolvedValue(5);
    await expect(service.addReference('user-a', companyA, TINY)).rejects.toThrow(
      /Limite de 5 imagens/,
    );
  });
});
