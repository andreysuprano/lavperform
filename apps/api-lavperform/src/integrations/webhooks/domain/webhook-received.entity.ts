export class WebhookReceived {
    id: string;
    companyId: string;
    partnerId: string;
    data: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<WebhookReceived>) {
        Object.assign(this, partial);
    }
}
