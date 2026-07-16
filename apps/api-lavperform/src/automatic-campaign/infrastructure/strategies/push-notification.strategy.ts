import { Injectable, NotImplementedException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class PushNotificationStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.PUSH_NOTIFICATION;

    async generateMessages(_ctx: GenerateMessagesContext): Promise<void> {
        throw new NotImplementedException(
            'Canal PUSH_NOTIFICATION ainda não está implementado',
        );
    }
}
