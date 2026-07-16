export class RfvConfiguration {
    id: string;
    companyId: string;
    recencyPeriodDays: number;
    frequencyPeriodDays: number;
    monetaryPeriodDays: number;
    recencyThresholds: number[];
    frequencyThresholds: number[];
    monetaryThresholds: number[];
    autoRecalculate: boolean;
    recalculateFrequency: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<RfvConfiguration>) {
        Object.assign(this, partial);
    }
}
