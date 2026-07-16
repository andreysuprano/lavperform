import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ApiKeyStatus } from '@prisma/client';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { PrismaService } from '../../prisma/prisma.service';
import { PublicApiContext } from './interfaces/api-context.interface';

const API_KEY_PREFIX = 'fcrm';

@Injectable()
export class ApiKeyService {
  constructor(private readonly prisma: PrismaService) {}

  hashKey(rawKey: string): string {
    return createHash('sha256').update(rawKey).digest('hex');
  }

  encryptSecret(rawKey: string): string {
    const iv = randomBytes(12);
    const cipher = createCipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    const encrypted = Buffer.concat([
      cipher.update(rawKey, 'utf8'),
      cipher.final(),
    ]);
    const tag = cipher.getAuthTag();
    return `${iv.toString('base64url')}.${tag.toString('base64url')}.${encrypted.toString('base64url')}`;
  }

  decryptSecret(encryptedSecret: string): string {
    const [ivB64, tagB64, dataB64] = encryptedSecret.split('.');
    if (!ivB64 || !tagB64 || !dataB64) {
      throw new Error('Formato de secret criptografado inválido');
    }

    const iv = Buffer.from(ivB64, 'base64url');
    const tag = Buffer.from(tagB64, 'base64url');
    const data = Buffer.from(dataB64, 'base64url');
    const decipher = createDecipheriv('aes-256-gcm', this.getEncryptionKey(), iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
  }

  generateKeyMaterial(): { prefix: string; secret: string; rawKey: string; hashedKey: string } {
    const prefix = randomBytes(4).toString('hex');
    const secret = randomBytes(24).toString('base64url');
    const rawKey = `${API_KEY_PREFIX}_${prefix}_${secret}`;
    return {
      prefix,
      secret,
      rawKey,
      hashedKey: this.hashKey(rawKey),
    };
  }

  private getEncryptionKey(): Buffer {
    const secret =
      process.env.PUBLIC_API_KEY_ENCRYPTION_SECRET ?? process.env.JWT_SECRET;
    if (!secret) {
      throw new Error(
        'PUBLIC_API_KEY_ENCRYPTION_SECRET ou JWT_SECRET deve estar definido',
      );
    }
    return createHash('sha256').update(secret).digest();
  }

  parseRawKey(rawKey: string): { prefix: string } | null {
    const trimmed = rawKey.trim();
    if (!trimmed.startsWith(`${API_KEY_PREFIX}_`)) {
      return null;
    }

    const rest = trimmed.slice(`${API_KEY_PREFIX}_`.length);
    const separatorIndex = rest.indexOf('_');
    if (separatorIndex <= 0 || separatorIndex >= rest.length - 1) {
      return null;
    }

    const prefix = rest.slice(0, separatorIndex);
    const secret = rest.slice(separatorIndex + 1);
    if (!prefix || !secret) {
      return null;
    }

    return { prefix };
  }

  async validateKey(rawKey: string): Promise<PublicApiContext> {
    if (!rawKey?.trim()) {
      throw new UnauthorizedException('API key ausente');
    }

    const parsed = this.parseRawKey(rawKey.trim());
    if (!parsed) {
      throw new UnauthorizedException('API key inválida');
    }

    const apiKey = await this.prisma.publicApiKey.findUnique({
      where: { prefix: parsed.prefix },
      include: {
        company: { select: { id: true, deletedAt: true } },
      },
    });

    if (!apiKey) {
      throw new UnauthorizedException('API key inválida');
    }

    const hashed = this.hashKey(rawKey.trim());
    if (apiKey.hashedKey !== hashed) {
      throw new UnauthorizedException('API key inválida');
    }

    if (apiKey.status === ApiKeyStatus.REVOKED) {
      throw new UnauthorizedException('API key revogada');
    }

    if (apiKey.status === ApiKeyStatus.EXPIRED) {
      throw new UnauthorizedException('API key expirada');
    }

    if (apiKey.expiresAt && apiKey.expiresAt < new Date()) {
      await this.prisma.publicApiKey.update({
        where: { id: apiKey.id },
        data: { status: ApiKeyStatus.EXPIRED },
      });
      throw new UnauthorizedException('API key expirada');
    }

    if (apiKey.company.deletedAt) {
      throw new UnauthorizedException('Empresa inativa');
    }

    await this.prisma.publicApiKey.update({
      where: { id: apiKey.id },
      data: { lastUsedAt: new Date() },
    });

    return {
      apiKeyId: apiKey.id,
      companyId: apiKey.companyId,
    };
  }
}
