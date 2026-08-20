import { AudienceTargetingMode } from '@prisma/client';

export class Campaign {
    id: string;
    name: string;
    scheduledDate: Date;
    messageText: string;
    segmentation: string;
    targetingMode?: AudienceTargetingMode;
    audienceId?: string | null;
    customSendListId?: string | null;
    maxDailySends: number;
    imageUrl?: string | null;
    status: string; // Using string to decouple from Prisma enum for now, or assume 'WAITING' | 'PROCESSING' etc
    modifiedByAI: boolean;
    companyId: string;
    trakingCode?: string | null;
    createdAt: Date;
    updatedAt: Date;

    // Potential Relations placeholders
    campaignMetric?: any[];
    messages?: any[];

    constructor(partial: Partial<Campaign>) {
        Object.assign(this, partial);
    }
}
