import { Injectable } from '@nestjs/common';
import { CampaignChannel, MessageStatus } from '@prisma/client';
import { DateTime } from 'luxon';
import { PrismaService } from '../../prisma/prisma.service';
import { RenitencyService } from './renitency.service';
import { getRenitencyChannelGroup } from '../common/renitency-channel.utils';

export interface RenitencyContext {
    companyId: string;
    customerId: string;
    channel: CampaignChannel;
    campaignId?: string | null;
    automaticCampaignId?: string | null;
    weatherAlertHistoryId?: string | null;
}

export interface RenitencyResult {
    allowed: boolean;
    reason?: string;
    nextEligibleAt?: Date;
}

@Injectable()
export class RenitencyEvaluatorService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly renitencyService: RenitencyService,
    ) {}

    shouldApplyRenitency(ctx: Pick<RenitencyContext, 'campaignId' | 'automaticCampaignId' | 'weatherAlertHistoryId'>): boolean {
        if (ctx.campaignId && !ctx.automaticCampaignId) {
            return false;
        }
        return !!(ctx.automaticCampaignId || ctx.weatherAlertHistoryId);
    }

    async canContactCustomer(ctx: RenitencyContext): Promise<RenitencyResult> {
        if (!this.shouldApplyRenitency(ctx)) {
            return { allowed: true };
        }

        const config = await this.renitencyService.getOrCreateConfiguration(ctx.companyId);
        const channelGroup = getRenitencyChannelGroup(ctx.channel);

        const lastMessage = await this.prisma.message.findFirst({
            where: {
                customerId: ctx.customerId,
                companyId: ctx.companyId,
                channel: { in: channelGroup },
                status: MessageStatus.SENT,
            },
            orderBy: { updatedAt: 'desc' },
            select: { updatedAt: true },
        });

        if (!lastMessage) {
            return { allowed: true };
        }

        const tz = process.env.OPENING_HOURS_TIMEZONE || 'America/Sao_Paulo';
        const now = DateTime.now().setZone(tz);
        const lastContact = DateTime.fromJSDate(lastMessage.updatedAt).setZone(tz);
        const daysSince = Math.floor(now.diff(lastContact, 'days').days);

        if (daysSince >= config.minDaysBetween) {
            return { allowed: true };
        }

        const nextEligibleAt = lastContact.plus({ days: config.minDaysBetween }).toJSDate();
        return {
            allowed: false,
            reason: `RENITENCY_BLOCKED: último contato neste canal há ${daysSince} dia(s), mínimo configurado: ${config.minDaysBetween}`,
            nextEligibleAt,
        };
    }
}
