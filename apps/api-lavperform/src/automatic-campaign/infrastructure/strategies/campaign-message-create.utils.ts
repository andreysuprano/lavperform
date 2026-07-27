import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

type CreateAutomaticCampaignMessageParams = {
    campaignId: string;
    customerId: string;
    startOfToday: Date;
    endOfToday: Date;
    data: Prisma.MessageUncheckedCreateInput;
};

export async function createAutomaticCampaignMessageIfAbsentToday(
    prisma: PrismaService,
    params: CreateAutomaticCampaignMessageParams,
): Promise<'created' | 'skipped'> {
    return prisma.$transaction(async (tx) => {
        const existing = await tx.message.findFirst({
            where: {
                customerId: params.customerId,
                automaticCampaignId: params.campaignId,
                createdAt: {
                    gte: params.startOfToday,
                    lte: params.endOfToday,
                },
            },
            select: { id: true },
        });

        if (existing) {
            return 'skipped';
        }

        await tx.message.create({ data: params.data });
        return 'created';
    });
}
