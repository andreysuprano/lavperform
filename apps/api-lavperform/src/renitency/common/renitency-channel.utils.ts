import { CampaignChannel } from '@prisma/client';

const WHATSAPP_CHANNELS: CampaignChannel[] = [
    CampaignChannel.WHATSAPP_WEB,
    CampaignChannel.WHATSAPP_BUSINESS_API,
];

export function getRenitencyChannelGroup(channel: CampaignChannel): CampaignChannel[] {
    if (WHATSAPP_CHANNELS.includes(channel)) {
        return WHATSAPP_CHANNELS;
    }
    return [channel];
}
