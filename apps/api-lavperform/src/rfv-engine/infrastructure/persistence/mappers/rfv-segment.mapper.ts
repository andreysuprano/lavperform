import { RfvSegment } from '../../../domain/rfv-segment.entity';
import { CustomerRfvHistory } from '@prisma/client';

export class RfvSegmentMapper {
    static toDomain(prismaRfvHistory: CustomerRfvHistory): RfvSegment {
        return new RfvSegment({
            id: prismaRfvHistory.id,
            customerId: prismaRfvHistory.customerId,
            recencyScore: prismaRfvHistory.recencyScore,
            frequencyScore: prismaRfvHistory.frequencyScore,
            monetaryScore: prismaRfvHistory.monetaryScore,
            rfvSegment: prismaRfvHistory.rfvSegment,
            daysSinceLastOrder: prismaRfvHistory.daysSinceLastOrder,
            totalOrders: prismaRfvHistory.totalOrders,
            totalSpent: Number(prismaRfvHistory.totalSpent),
            averageTicket: Number(prismaRfvHistory.averageTicket),
            analysisStartDate: prismaRfvHistory.analysisStartDate,
            analysisEndDate: prismaRfvHistory.analysisEndDate,
            calculatedAt: prismaRfvHistory.calculatedAt,
        });
    }

    static toPrisma(rfvSegment: Partial<RfvSegment>): any {
        return {
            customerId: rfvSegment.customerId,
            recencyScore: rfvSegment.recencyScore,
            frequencyScore: rfvSegment.frequencyScore,
            monetaryScore: rfvSegment.monetaryScore,
            rfvSegment: rfvSegment.rfvSegment,
            daysSinceLastOrder: rfvSegment.daysSinceLastOrder,
            totalOrders: rfvSegment.totalOrders,
            totalSpent: rfvSegment.totalSpent,
            averageTicket: rfvSegment.averageTicket,
            analysisStartDate: rfvSegment.analysisStartDate,
            analysisEndDate: rfvSegment.analysisEndDate,
        };
    }
}
