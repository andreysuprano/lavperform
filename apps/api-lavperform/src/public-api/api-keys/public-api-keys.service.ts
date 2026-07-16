import { Injectable, NotFoundException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { ApiKeyService } from '../auth/api-key.service';
import { CreatePublicApiKeyDto } from './dto/create-public-api-key.dto';

const DEFAULT_API_KEY_NAME = 'Integração direta';

const apiKeySelect = {
  id: true,
  name: true,
  prefix: true,
  status: true,
  expiresAt: true,
  lastUsedAt: true,
  revokedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

@Injectable()
export class PublicApiKeysService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async list(companyId: string) {
    await this.ensureCompanyExists(companyId);

    return this.prisma.publicApiKey.findMany({
      where: { companyId },
      select: apiKeySelect,
      orderBy: { createdAt: 'desc' },
    });
  }

  async getActive(companyId: string) {
    await this.ensureCompanyExists(companyId);

    const apiKey = await this.prisma.publicApiKey.findFirst({
      where: {
        companyId,
        status: ApiKeyStatus.ACTIVE,
      },
      select: {
        ...apiKeySelect,
        encryptedSecret: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!apiKey) {
      throw new NotFoundException('Nenhuma API key ativa encontrada');
    }

    const { encryptedSecret, ...rest } = apiKey;

    return {
      ...rest,
      secret: encryptedSecret
        ? this.apiKeyService.decryptSecret(encryptedSecret)
        : null,
    };
  }

  async create(companyId: string, dto: CreatePublicApiKeyDto = {}) {
    await this.ensureCompanyExists(companyId);

    const { prefix, rawKey, hashedKey } = this.apiKeyService.generateKeyMaterial();

    const apiKey = await this.prisma.publicApiKey.create({
      data: {
        name: dto.name?.trim() || DEFAULT_API_KEY_NAME,
        prefix,
        hashedKey,
        encryptedSecret: this.apiKeyService.encryptSecret(rawKey),
        companyId,
        expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        expiresAt: true,
        createdAt: true,
      },
    });

    return {
      ...apiKey,
      secret: rawKey,
    };
  }

  async rotate(companyId: string, dto: CreatePublicApiKeyDto = {}) {
    await this.ensureCompanyExists(companyId);

    const { prefix, rawKey, hashedKey } = this.apiKeyService.generateKeyMaterial();
    const encryptedSecret = this.apiKeyService.encryptSecret(rawKey);
    const now = new Date();

    const apiKey = await this.prisma.$transaction(async (tx) => {
      await tx.publicApiKey.updateMany({
        where: {
          companyId,
          status: ApiKeyStatus.ACTIVE,
        },
        data: {
          status: ApiKeyStatus.REVOKED,
          revokedAt: now,
        },
      });

      return tx.publicApiKey.create({
        data: {
          name: dto.name?.trim() || DEFAULT_API_KEY_NAME,
          prefix,
          hashedKey,
          encryptedSecret,
          companyId,
          expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
        },
        select: {
          id: true,
          name: true,
          prefix: true,
          status: true,
          expiresAt: true,
          createdAt: true,
        },
      });
    });

    return {
      ...apiKey,
      secret: rawKey,
    };
  }

  async revoke(companyId: string, id: string) {
    await this.ensureKeyBelongsToCompany(companyId, id);

    return this.prisma.publicApiKey.update({
      where: { id },
      data: {
        status: ApiKeyStatus.REVOKED,
        revokedAt: new Date(),
      },
      select: {
        id: true,
        name: true,
        prefix: true,
        status: true,
        revokedAt: true,
      },
    });
  }

  async remove(companyId: string, id: string) {
    await this.ensureKeyBelongsToCompany(companyId, id);
    await this.prisma.publicApiKey.delete({ where: { id } });
  }

  private async ensureCompanyExists(companyId: string) {
    const company = await this.prisma.company.findFirst({
      where: { id: companyId, deletedAt: null },
    });
    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }
  }

  private async ensureKeyBelongsToCompany(companyId: string, id: string) {
    const apiKey = await this.prisma.publicApiKey.findFirst({
      where: { id, companyId },
    });
    if (!apiKey) {
      throw new NotFoundException('API key não encontrada');
    }
    return apiKey;
  }
}
