export class Coupon {
    id: string;
    companyId: string;
    code: string;
    description: string | null;
    type: string;
    unit: string;
    value: number;
    validUntil: Date;
    active: boolean;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;

    constructor(partial: Partial<Coupon>) {
        Object.assign(this, partial);
    }
}
