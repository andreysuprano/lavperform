export class RfvScore {
    recencyScore: number;
    frequencyScore: number;
    monetaryScore: number;
    segment: string;
    daysSinceLastOrder?: number;
    totalOrders: number;
    totalSpent: number;
    averageTicket: number;

    constructor(partial: Partial<RfvScore>) {
        Object.assign(this, partial);
    }

    getRfvKey(): string {
        return `${this.recencyScore}${this.frequencyScore}${this.monetaryScore}`;
    }
}
