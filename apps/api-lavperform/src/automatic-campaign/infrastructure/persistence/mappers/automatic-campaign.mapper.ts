import {
    AutomaticCampaign as PrismaAutomaticCampaign,
    Gift as PrismaGift,
    AutomaticCampaignCreative as PrismaCreative,
    Coupon as PrismaCoupon,
} from '@prisma/client';
import {
    AutomaticCampaign,
    AutomaticCampaignCreative,
} from '../../../domain/automatic-campaign.entity';

type PrismaAutomaticCampaignWithRelations = PrismaAutomaticCampaign & {
    gifts?: PrismaGift[];
    creatives?: PrismaCreative[];
    coupon?: PrismaCoupon | null;
    campaignMetric?: any[];
};

export class AutomaticCampaignMapper {
    static toDomain(prismaCampaign: PrismaAutomaticCampaignWithRelations): AutomaticCampaign {
        const entity = new AutomaticCampaign({
            id: prismaCampaign.id,
            name: prismaCampaign.name,
            type: prismaCampaign.type,
            channel: prismaCampaign.channel,
            status: prismaCampaign.status,
            maxDailySends: (prismaCampaign as any).maxDailySends ?? 50,
            active: prismaCampaign.active,
            daysOfWeek: prismaCampaign.daysOfWeek,
            images: prismaCampaign.images || '',
            segmentation: prismaCampaign.segmentation,
            targetingMode: (prismaCampaign as any).targetingMode,
            audienceId: (prismaCampaign as any).audienceId ?? null,
            messageText: prismaCampaign.messageText,
            startDate: prismaCampaign.startDate,
            endDate: prismaCampaign.endDate,
            companyId: prismaCampaign.companyId,
            couponId: prismaCampaign.couponId,
            createdAt: prismaCampaign.createdAt,
            updatedAt: prismaCampaign.updatedAt,
            deletedAt: prismaCampaign.deletedAt,
            lastProcessedAt: prismaCampaign.lastProcessedAt,
            metaMessageTemplateId: (prismaCampaign as any).metaMessageTemplateId ?? null,
            metaTemplateVariableMappings: (prismaCampaign as any).metaTemplateVariableMappings ?? null,
        });

        if (prismaCampaign.gifts) {
            entity.gifts = prismaCampaign.gifts;
        }

        if (prismaCampaign.creatives) {
            entity.creatives = prismaCampaign.creatives.map(
                (c) =>
                    new AutomaticCampaignCreative({
                        id: c.id,
                        automaticCampaignId: c.automaticCampaignId,
                        imageUrls: c.imageUrls,
                        title: c.title,
                        message: c.message,
                        link: c.link,
                        createdAt: c.createdAt,
                        updatedAt: c.updatedAt,
                    }),
            );
        }

        if (prismaCampaign.coupon) {
            entity.coupon = prismaCampaign.coupon;
        }

        if (prismaCampaign.campaignMetric) {
            entity.campaignMetric = prismaCampaign.campaignMetric;
        }

        return entity;
    }
}
