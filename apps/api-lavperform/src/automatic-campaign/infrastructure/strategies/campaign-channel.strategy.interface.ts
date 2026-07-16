import {
    AutomaticCampaign as PrismaAutomaticCampaign,
    AutomaticCampaignCreative as PrismaCreative,
    CampaignChannel,
    Coupon,
    Customer,
    OpeningHours,
} from '@prisma/client';
import { SendTimeWindow } from '../../application/campaign-send-schedule.utils';

export type AutomaticCampaignWithRelations = PrismaAutomaticCampaign & {
    creatives: PrismaCreative[];
    coupon?: Coupon | null;
};

export interface GenerateMessagesContext {
    campaign: AutomaticCampaignWithRelations;
    customers: Customer[];
    openingHours?: OpeningHours | null;
    sendTimeWindow: SendTimeWindow;
    alreadySentToday: number;
    maxDailySends: number;
}

export interface ICampaignChannelStrategy {
    readonly channel: CampaignChannel;
    generateMessages(ctx: GenerateMessagesContext): Promise<void>;
}

export const CAMPAIGN_CHANNEL_STRATEGIES = Symbol('CAMPAIGN_CHANNEL_STRATEGIES');
