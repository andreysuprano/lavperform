export class RenitencyConfiguration {
    id: string;
    companyId: string;
    minDaysBetween: number;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<RenitencyConfiguration>) {
        Object.assign(this, partial);
    }
}
