import { Campaign as PrismaCampaign, CampaignMetric as PrismaMetric } from '@prisma/client';
import { Campaign } from '../../../domain/campaign.entity';

type PrismaCampaignWithRelations = PrismaCampaign & {
    campaignMetric?: PrismaMetric[];
};

export class CampaignMapper {
    static toDomain(prismaCampaign: PrismaCampaignWithRelations): Campaign {
        const entity = new Campaign({
            id: prismaCampaign.id,
            name: prismaCampaign.name,
            scheduledDate: prismaCampaign.scheduledDate,
            messageText: prismaCampaign.messageText,
            segmentation: prismaCampaign.segmentation,
            targetingMode: (prismaCampaign as any).targetingMode,
            audienceId: (prismaCampaign as any).audienceId ?? null,
            maxDailySends: (prismaCampaign as any).maxDailySends ?? 50,
            imageUrl: prismaCampaign.imageUrl,
            status: prismaCampaign.status,
            modifiedByAI: prismaCampaign.modifiedByAI,
            companyId: prismaCampaign.companyId,
            trakingCode: prismaCampaign.trakingCode,
            createdAt: prismaCampaign.createdAt,
            updatedAt: prismaCampaign.updatedAt,
        });

        if (prismaCampaign.campaignMetric) {
            entity.campaignMetric = prismaCampaign.campaignMetric;
        }

        return entity;
    }
}
