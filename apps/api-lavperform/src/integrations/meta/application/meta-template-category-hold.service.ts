import { Injectable, Logger } from '@nestjs/common';
import { MetaTemplateCategory } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type HeldCampaign = {
  id: string;
  name: string;
  companyId: string;
};

@Injectable()
export class MetaTemplateCategoryHoldService {
  private readonly logger = new Logger(MetaTemplateCategoryHoldService.name);

  constructor(private readonly prisma: PrismaService) {}

  async applyByMetaTemplateId(
    metaTemplateId: string | number,
    remoteCategory: string | null | undefined,
  ): Promise<void> {
    const templates = await this.prisma.metaMessageTemplate.findMany({
      where: { metaTemplateId: String(metaTemplateId) },
      select: { id: true },
    });

    for (const template of templates) {
      await this.apply(template.id, remoteCategory);
    }
  }

  /**
   * Grava a categoria que a Meta devolveu. Utility que virou marketing pausa
   * as campanhas automáticas ligadas ao template. A data permanece depois
   * que a loja reativa o disparo.
   */
  async apply(
    templateId: string,
    remoteCategory: string | null | undefined,
  ): Promise<void> {
    const next = this.toCategory(remoteCategory);
    if (!next) return;

    const current = await this.prisma.metaMessageTemplate.findUnique({
      where: { id: templateId },
      select: { id: true, category: true },
    });
    if (!current || current.category === next) return;

    const held = await this.prisma.$transaction(async (tx) => {
      const fresh = await tx.metaMessageTemplate.findUnique({
        where: { id: templateId },
        select: { id: true, category: true },
      });
      if (!fresh || fresh.category === next) return [] as HeldCampaign[];

      const shouldHold =
        fresh.category === MetaTemplateCategory.UTILITY &&
        next === MetaTemplateCategory.MARKETING;

      await tx.metaMessageTemplate.update({
        where: { id: fresh.id },
        data: { category: next },
      });

      if (!shouldHold) return [] as HeldCampaign[];

      const campaigns = await tx.automaticCampaign.findMany({
        where: {
          deletedAt: null,
          metaCategoryHoldAt: null,
          OR: [
            { metaMessageTemplateId: fresh.id },
            { creatives: { some: { metaTemplate: { id: fresh.id } } } },
          ],
        },
        select: { id: true, name: true, companyId: true },
      });

      if (campaigns.length === 0) return [] as HeldCampaign[];

      await tx.automaticCampaign.updateMany({
        where: { id: { in: campaigns.map((campaign) => campaign.id) } },
        data: { active: false, metaCategoryHoldAt: new Date() },
      });

      return campaigns;
    });

    for (const campaign of held) {
      this.logger.warn(
        `Campanha ${campaign.id} (${campaign.name}) pausada: a Meta mudou o template para marketing`,
      );
    }
  }

  private toCategory(
    category?: string | null,
  ): MetaTemplateCategory | undefined {
    const value = category?.trim().toUpperCase() as MetaTemplateCategory | undefined;
    return value && value in MetaTemplateCategory ? value : undefined;
  }
}
