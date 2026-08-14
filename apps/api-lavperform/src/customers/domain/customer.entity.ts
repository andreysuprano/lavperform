export class Customer {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    cpf?: string | null;
    birthDate?: Date | null;
    firstOrderDate?: Date | null;
    lastOrderDate?: Date | null;
    orderCount?: number;
    bestOrderDay?: string | null;
    bestOrderHour?: string | null;
    lastContactDate?: Date | null;
    rfvClassification?: string | null;
    gender?: string | null;
    observations?: string | null;
    whatsappOptin: boolean;
    whatsappVerified: boolean;
    whatsappVerifiedAt?: Date | null;
    averageTicket?: number | null;
    companyId: string;
    addressId?: string | null;
    createdAt: Date;
    updatedAt: Date;

    address?: Address | null;

    constructor(partial: Partial<Customer>) {
        Object.assign(this, partial);
    }
}

export class Address {
    id: string;
    street?: string | null;
    number?: string | null;
    complement?: string | null;
    neighborhood?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<Address>) {
        Object.assign(this, partial);
    }
}
