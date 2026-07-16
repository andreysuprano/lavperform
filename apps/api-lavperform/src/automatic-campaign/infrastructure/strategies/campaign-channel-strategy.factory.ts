import { Injectable, NotImplementedException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import { ICampaignChannelStrategy } from './campaign-channel.strategy.interface';
import { WhatsappWebStrategy } from './whatsapp-web.strategy';
import { WhatsappBusinessApiStrategy } from './whatsapp-business-api.strategy';
import { SmsStrategy } from './sms.strategy';
import { RcsStrategy } from './rcs.strategy';
import { EmailStrategy } from './email.strategy';
import { PushNotificationStrategy } from './push-notification.strategy';

@Injectable()
export class CampaignChannelStrategyFactory {
    private readonly strategies: Map<CampaignChannel, ICampaignChannelStrategy>;

    constructor(
        whatsappWeb: WhatsappWebStrategy,
        whatsappBusinessApi: WhatsappBusinessApiStrategy,
        sms: SmsStrategy,
        rcs: RcsStrategy,
        email: EmailStrategy,
        pushNotification: PushNotificationStrategy,
    ) {
        this.strategies = new Map<CampaignChannel, ICampaignChannelStrategy>([
            [CampaignChannel.WHATSAPP_WEB, whatsappWeb],
            [CampaignChannel.WHATSAPP_BUSINESS_API, whatsappBusinessApi],
            [CampaignChannel.SMS, sms],
            [CampaignChannel.RCS, rcs],
            [CampaignChannel.EMAIL, email],
            [CampaignChannel.PUSH_NOTIFICATION, pushNotification],
        ]);
    }

    get(channel: CampaignChannel): ICampaignChannelStrategy {
        const strategy = this.strategies.get(channel);
        if (!strategy) {
            throw new NotImplementedException(`Canal de campanha não suportado: ${channel}`);
        }
        return strategy;
    }
}
