export class BusinessPartner {
    id: string;
    name: string;
    email: string;
    phone: string;
    cnpj?: string;
    avatarUrl?: string;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<BusinessPartner>) {
        Object.assign(this, partial);
    }
}
