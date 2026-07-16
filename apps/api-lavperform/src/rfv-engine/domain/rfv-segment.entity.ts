export class RfvSegment {
    id: string;
    customerId: string;
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
    rfvSegment: string;
    daysSinceLastOrder?: number | null;
    totalOrders: number;
    totalSpent: number;
    averageTicket: number;
    analysisStartDate: Date;
    analysisEndDate: Date;
    calculatedAt: Date;

    constructor(partial: Partial<RfvSegment>) {
        Object.assign(this, partial);
    }
}
