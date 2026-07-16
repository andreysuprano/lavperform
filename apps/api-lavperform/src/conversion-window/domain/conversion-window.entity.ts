export class ConversionWindow {
    id: string;
    companyId: string;
    rfvClassification: string;
    thresholdDays: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<ConversionWindow>) {
        Object.assign(this, partial);
    }
}
