export class CompanySubscription {
    id: string;
    companyId: string;
    subscriptionId?: string | null;
    planId: string;
    createdAt: Date;
    updatedAt: Date;

    plan?: any; // To avoid circular dependency import if not strictly needed in domain logic right now

    constructor(partial: Partial<CompanySubscription>) {
        Object.assign(this, partial);
    }
}
