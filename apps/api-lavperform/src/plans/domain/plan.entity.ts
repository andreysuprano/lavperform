export class Plan {
    id: string;
    name: string;
    description: string;
    price: number;
    cycle: 'MONTHLY' | 'YEARLY' | 'SEMIANNUALLY' | 'QUARTERLY';
    recommended: boolean;
    maxPayments: number;
    endDate?: Date | null;
    active: boolean;
    isSelfCheckout: boolean;
    allowBoleto: boolean;
    allowPix: boolean;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Plan>) {
        Object.assign(this, partial);
    }
}
