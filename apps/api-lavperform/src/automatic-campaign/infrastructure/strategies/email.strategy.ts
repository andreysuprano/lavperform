import { Injectable, NotImplementedException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class EmailStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.EMAIL;

    async generateMessages(_ctx: GenerateMessagesContext): Promise<void> {
        throw new NotImplementedException('Canal EMAIL ainda não está implementado');
    }
}
