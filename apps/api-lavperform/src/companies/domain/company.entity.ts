export class Company {
    id: string;
    name: string;
    cnpj?: string | null;
    email?: string | null;
    phone?: string | null;
    avatarUrl?: string | null;
    state: string;
    deletedAt?: Date | null;
    addressId?: string | null;
    address?: any;
    businessPartnerId?: string | null;
    slug?: string | null;
    showIncentivizedSales?: boolean;
    showTodayPurchases?: boolean;
    createdAt: Date;
    updatedAt: Date;
    // Relations could be typed more strictly if needed, using generic 'any' for now to speed up migration of complex nested includes
    userCompanies?: any[];
    customers?: any[];
    products?: any[];
    schedules?: any[];
    openingHours?: any[];
    companySubscriptions?: any[];
    digitalMenuIntegration?: any[];
    automaticCampaigns?: any[];

    constructor(partial: Partial<Company>) {
        Object.assign(this, partial);
    }
}
