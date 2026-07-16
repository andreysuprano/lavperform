import { Injectable, NotImplementedException } from '@nestjs/common';
import { CampaignChannel } from '@prisma/client';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class RcsStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.RCS;

    async generateMessages(_ctx: GenerateMessagesContext): Promise<void> {
        throw new NotImplementedException('Canal RCS ainda não está implementado');
    }
}
