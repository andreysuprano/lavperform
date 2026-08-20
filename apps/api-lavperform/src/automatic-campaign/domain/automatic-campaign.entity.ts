import { CampaignChannel, AutomaticCampaignStatus } from '@prisma/client';

export class AutomaticCampaignCreative {
    id: string;
    automaticCampaignId: string;
    imageUrls: string[];
    title: string;
    message: string;
    link?: string | null;
    createdAt: Date;
    updatedAt: Date;

    constructor(partial: Partial<AutomaticCampaignCreative>) {
        Object.assign(this, partial);
    }
}

export class AutomaticCampaign {
    id: string;
    name: string;
    type: string;
    channel: CampaignChannel;
    status: AutomaticCampaignStatus;
    maxDailySends: number;
    active: boolean;
    daysOfWeek: string[];
    messageText: string;
    startDate: Date;
    images: string;
    segmentation: string;
    targetingMode?: string;
    audienceId?: string | null;
    customSendListId?: string | null;
    endDate: Date | null;
    companyId: string;
    couponId?: string | null;
    coupon?: any;
    createdAt: Date;
    updatedAt: Date;
    deletedAt?: Date | null;
    lastProcessedAt?: Date | null;
    sendTimeStart?: string | null;
    sendTimeEnd?: string | null;
    metaMessageTemplateId?: string | null;
    metaTemplateVariableMappings?: unknown;
    gifts?: any[];
    creatives?: AutomaticCampaignCreative[];
    campaignMetric?: any[];

    constructor(partial: Partial<AutomaticCampaign>) {
        Object.assign(this, partial);
    }
}
