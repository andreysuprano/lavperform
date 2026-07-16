export class LinkPage {
    id: string;
    companyId: string;
    biography: string | null;
    whatsappMessage: string | null;
    coverImage: string | null;
    bgColor: string | null;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    company?: any;
    links?: any[];
    galleries?: any[];

    constructor(partial: Partial<LinkPage>) {
        Object.assign(this, partial);
    }
}
