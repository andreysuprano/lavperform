import { Partner } from "./partner.entity";

export class DigitalMenuIntegration {
    id: string;
    companyId: string;
    apiKey?: string;
    apiSecret?: string;
    username?: string;
    password?: string;
    partnerId?: string;
    active: boolean;
    merchantId?: string;
    digitalMenuUrl?: string;
    partner?: Partner;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<DigitalMenuIntegration>) {
        Object.assign(this, partial);
    }
}
