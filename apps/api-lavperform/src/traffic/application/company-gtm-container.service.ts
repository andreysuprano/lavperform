import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { parseGoogleTagManagerCode } from '../domain/parse-google-tag-manager-code';
import { GTM_CODE_MESSAGE } from '../domain/tracking-messages';

export type GtmRecord = { containerId: string | null; enabled: boolean };

@Injectable()
export class CompanyGtmContainerService {
  constructor(private readonly prisma: PrismaService) {}

  async get(companyId: string): Promise<GtmRecord> {
    const row = await this.prisma.companyGtmContainer.findUnique({ where: { companyId } });
    if (!row) return { containerId: null, enabled: false };
    return { containerId: row.containerId, enabled: row.enabled };
  }

  async save(companyId: string, input: { baseCode?: string; enabled?: boolean }): Promise<GtmRecord> {
    const existing = await this.prisma.companyGtmContainer.findUnique({ where: { companyId } });
    const hasCode = typeof input.baseCode === 'string';

    if (hasCode) {
      const containerId = parseGoogleTagManagerCode(input.baseCode ?? '');
      if (!containerId) throw new BadRequestException({ message: GTM_CODE_MESSAGE });

      const enabled = input.enabled !== undefined ? input.enabled : (existing?.enabled ?? true);
      const saved = await this.prisma.companyGtmContainer.upsert({
        where: { companyId },
        create: { companyId, containerId, enabled },
        update: { containerId, enabled },
      });
      return { containerId: saved.containerId, enabled: saved.enabled };
    }

    if (!existing) throw new BadRequestException({ message: GTM_CODE_MESSAGE });

    if (input.enabled !== undefined) {
      const saved = await this.prisma.companyGtmContainer.update({
        where: { companyId },
        data: { enabled: input.enabled },
      });
      return { containerId: saved.containerId, enabled: saved.enabled };
    }

    return { containerId: existing.containerId, enabled: existing.enabled };
  }

  async remove(companyId: string): Promise<void> {
    await this.prisma.companyGtmContainer.deleteMany({ where: { companyId } });
  }
}
