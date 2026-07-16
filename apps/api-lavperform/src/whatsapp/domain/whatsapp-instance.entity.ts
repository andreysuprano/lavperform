import { WhatsappInstanceStatus } from '@prisma/client';

export class WhatsappInstance {
    id: string;
    name: string;
    status: WhatsappInstanceStatus;
    token: string;
    phoneNumber: string | null;
    companyId: string;
    createdAt: Date;
    updatedAt: Date;

    // Relations
    company?: any;

    constructor(partial: Partial<WhatsappInstance>) {
        Object.assign(this, partial);
    }
}
