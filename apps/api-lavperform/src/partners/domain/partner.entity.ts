export class Partner {
    id: string;
    name: string;
    logoUrl?: string;
    baseUrlWebhook?: string;
    partnerSlug?: string;
    active?: boolean;
    createdAt: Date;
    digitalMenuIntegrations?: any[];

    constructor(partial: Partial<Partner>) {
        Object.assign(this, partial);
    }
}
