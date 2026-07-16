export class Partner {
    id: string;
    name: string;
    logoUrl?: string;
    baseUrlWebhook?: string;
    partnerSlug?: string;
    createdAt: Date;
    digitalMenuIntegrations?: any[];

    constructor(partial: Partial<Partner>) {
        Object.assign(this, partial);
    }
}
