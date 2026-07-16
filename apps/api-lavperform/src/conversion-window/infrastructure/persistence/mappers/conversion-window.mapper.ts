import { ConversionWindow } from '../../../domain/conversion-window.entity';
import { CampaignConversionWindow as PrismaConversionWindow } from '@prisma/client';

export class ConversionWindowMapper {
    static toDomain(row: PrismaConversionWindow): ConversionWindow {
        return new ConversionWindow({
            id: row.id,
            companyId: row.companyId,
            rfvClassification: row.rfvClassification,
            thresholdDays: row.thresholdDays,
            createdAt: row.createdAt,
            updatedAt: row.updatedAt,
        });
    }

    static toPrisma(data: Partial<ConversionWindow>): Record<string, unknown> {
        const prisma: Record<string, unknown> = {};
        if (data.companyId !== undefined) prisma.companyId = data.companyId;
        if (data.rfvClassification !== undefined) prisma.rfvClassification = data.rfvClassification;
        if (data.thresholdDays !== undefined) prisma.thresholdDays = data.thresholdDays;
        return prisma;
    }
}
