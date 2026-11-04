import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseMetaPixelCode } from '../domain/parse-meta-pixel-code';
import { META_PIXEL_CODE_MESSAGE } from '../domain/tracking-messages';

export type PixelRecord = { pixelId: string | null; enabled: boolean };

@Injectable()
export class CompanyMetaPixelService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string): Promise<PixelRecord> {
    const row = await this.prisma.companyMetaPixel.findUnique({ where: { companyId } });
    if (!row) return { pixelId: null, enabled: false };
    return { pixelId: row.pixelId, enabled: row.enabled };
  }

  async save(companyId: string, input: { baseCode?: string; enabled?: boolean }): Promise<PixelRecord> {
    const existing = await this.prisma.companyMetaPixel.findUnique({ where: { companyId } });
    const hasCode = typeof input.baseCode === 'string';

    if (hasCode) {
      const pixelId = parseMetaPixelCode(input.baseCode ?? '');
      if (!pixelId) throw new BadRequestException({ message: META_PIXEL_CODE_MESSAGE });

      const enabled = input.enabled !== undefined ? input.enabled : (existing?.enabled ?? true);
      const saved = await this.prisma.companyMetaPixel.upsert({
        where: { companyId },
        create: { companyId, pixelId, enabled },
        update: { pixelId, enabled },
      });
      return { pixelId: saved.pixelId, enabled: saved.enabled };
    }

    if (!existing) throw new BadRequestException({ message: META_PIXEL_CODE_MESSAGE });

    if (input.enabled !== undefined) {
      const saved = await this.prisma.companyMetaPixel.update({
        where: { companyId },
        data: { enabled: input.enabled },
      });
      return { pixelId: saved.pixelId, enabled: saved.enabled };
    }

    return { pixelId: existing.pixelId, enabled: existing.enabled };
  }

  async remove(companyId: string): Promise<void> {
    await this.prisma.companyMetaPixel.deleteMany({ where: { companyId } });
  }
}
