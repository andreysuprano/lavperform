import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { createHash } from 'crypto';
import { ApiKeyService } from 'src/public-api/auth/api-key.service';
import { PrismaService } from 'src/prisma/prisma.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;

  const mockPrisma = {
    publicApiKey: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
  };

  beforeEach(async () => {
    process.env.JWT_SECRET = 'test-jwt-secret';

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ApiKeyService,
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get(ApiKeyService);
    jest.clearAllMocks();
  });

  it('criptografa e descriptografa o secret da API key', () => {
    const rawKey = 'fcrm_abcd1234_secretpart';
    const encrypted = service.encryptSecret(rawKey);

    expect(encrypted).not.toContain(rawKey);
    expect(service.decryptSecret(encrypted)).toBe(rawKey);
  });

  it('valida uma API key ativa', async () => {
    const rawKey = 'fcrm_abcd1234_secretpart';
    mockPrisma.publicApiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      hashedKey: createHash('sha256').update(rawKey).digest('hex'),
      status: ApiKeyStatus.ACTIVE,
      expiresAt: null,
      companyId: 'company-1',
      company: { id: 'company-1', deletedAt: null },
    });
    mockPrisma.publicApiKey.update.mockResolvedValue({});

    const ctx = await service.validateKey(rawKey);

    expect(ctx).toEqual({
      apiKeyId: 'key-1',
      companyId: 'company-1',
    });
  });

  it('rejeita API key inválida', async () => {
    mockPrisma.publicApiKey.findUnique.mockResolvedValue(null);

    await expect(service.validateKey('fcrm_bad_prefix_secret')).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejeita API key revogada', async () => {
    const rawKey = 'fcrm_abcd1234_secretpart';
    mockPrisma.publicApiKey.findUnique.mockResolvedValue({
      id: 'key-1',
      hashedKey: createHash('sha256').update(rawKey).digest('hex'),
      status: ApiKeyStatus.REVOKED,
      company: { deletedAt: null },
    });

    await expect(service.validateKey(rawKey)).rejects.toThrow(UnauthorizedException);
  });

  it('valida API key cujo secret contém underscore (base64url)', async () => {
    const rawKey = 'fcrm_23acfe41_rpY5Wkn_E9DBXlTJkHuUdgkSlYKSvxuP';
    mockPrisma.publicApiKey.findUnique.mockResolvedValue({
      id: 'key-2',
      hashedKey: createHash('sha256').update(rawKey).digest('hex'),
      status: ApiKeyStatus.ACTIVE,
      expiresAt: null,
      companyId: 'company-2',
      company: { id: 'company-2', deletedAt: null },
    });
    mockPrisma.publicApiKey.update.mockResolvedValue({});

    const ctx = await service.validateKey(rawKey);

    expect(ctx).toEqual({
      apiKeyId: 'key-2',
      companyId: 'company-2',
    });
    expect(mockPrisma.publicApiKey.findUnique).toHaveBeenCalledWith({
      where: { prefix: '23acfe41' },
      include: {
        company: { select: { id: true, deletedAt: true } },
      },
    });
  });
});
