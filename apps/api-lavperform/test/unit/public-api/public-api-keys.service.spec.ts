import { NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { PublicApiKeysService } from 'src/public-api/api-keys/public-api-keys.service';
import { ApiKeyService } from 'src/public-api/auth/api-key.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PublicApiKeysService', () => {
  let service: PublicApiKeysService;

  const mockApiKeyService = {
    generateKeyMaterial: jest.fn(),
    encryptSecret: jest.fn(),
    decryptSecret: jest.fn(),
  };

  const mockPrisma = {
    company: { findFirst: jest.fn() },
    publicApiKey: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    $transaction: jest.fn(),
  };

  beforeEach(() => {
    process.env.JWT_SECRET = 'test-jwt-secret';
    jest.clearAllMocks();

    service = new PublicApiKeysService(
      mockPrisma as unknown as PrismaService,
      mockApiKeyService as unknown as ApiKeyService,
    );

    mockPrisma.company.findFirst.mockResolvedValue({ id: 'company-1' });
    mockApiKeyService.generateKeyMaterial.mockReturnValue({
      prefix: 'abcd1234',
      rawKey: 'fcrm_abcd1234_secretpart',
      hashedKey: 'hashed',
    });
    mockApiKeyService.encryptSecret.mockReturnValue('encrypted-secret');
    mockApiKeyService.decryptSecret.mockReturnValue('fcrm_abcd1234_secretpart');
  });

  describe('rotate', () => {
    it('revoga chaves ativas da empresa e cria uma nova', async () => {
      const createdKey = {
        id: 'key-2',
        name: 'Integração direta',
        prefix: 'abcd1234',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: null,
        createdAt: new Date('2026-06-23T12:00:00.000Z'),
      };

      mockPrisma.$transaction.mockImplementation(async (callback) =>
        callback({
          publicApiKey: {
            updateMany: mockPrisma.publicApiKey.updateMany,
            create: mockPrisma.publicApiKey.create,
          },
        }),
      );
      mockPrisma.publicApiKey.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.publicApiKey.create.mockResolvedValue(createdKey);

      const result = await service.rotate('company-1');

      expect(mockPrisma.publicApiKey.updateMany).toHaveBeenCalledWith({
        where: {
          companyId: 'company-1',
          status: ApiKeyStatus.ACTIVE,
        },
        data: expect.objectContaining({
          status: ApiKeyStatus.REVOKED,
          revokedAt: expect.any(Date),
        }),
      });
      expect(mockPrisma.publicApiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encryptedSecret: 'encrypted-secret',
            companyId: 'company-1',
            name: 'Integração direta',
          }),
        }),
      );
      expect(result).toEqual({
        ...createdKey,
        secret: 'fcrm_abcd1234_secretpart',
      });
    });
  });

  describe('getActive', () => {
    it('retorna a chave ativa com secret descriptografado', async () => {
      mockPrisma.publicApiKey.findFirst.mockResolvedValue({
        id: 'key-1',
        name: 'Integração direta',
        prefix: 'abcd1234',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: null,
        lastUsedAt: null,
        revokedAt: null,
        createdAt: new Date('2026-06-23T12:00:00.000Z'),
        updatedAt: new Date('2026-06-23T12:00:00.000Z'),
        encryptedSecret: 'encrypted-secret',
      });

      const result = await service.getActive('company-1');

      expect(mockApiKeyService.decryptSecret).toHaveBeenCalledWith(
        'encrypted-secret',
      );
      expect(result.secret).toBe('fcrm_abcd1234_secretpart');
      expect(result).not.toHaveProperty('encryptedSecret');
    });

    it('lança NotFoundException quando não há chave ativa', async () => {
      mockPrisma.publicApiKey.findFirst.mockResolvedValue(null);

      await expect(service.getActive('company-1')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('create', () => {
    it('persiste o secret criptografado', async () => {
      mockPrisma.publicApiKey.create.mockResolvedValue({
        id: 'key-1',
        name: 'Integração direta',
        prefix: 'abcd1234',
        status: ApiKeyStatus.ACTIVE,
        expiresAt: null,
        createdAt: new Date('2026-06-23T12:00:00.000Z'),
      });

      await service.create('company-1', {});

      expect(mockPrisma.publicApiKey.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            encryptedSecret: 'encrypted-secret',
            name: 'Integração direta',
          }),
        }),
      );
    });
  });
});
