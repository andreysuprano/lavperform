import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CampaignChannel, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { generateUniqueToken } from '../../../common/utils/generateUniqueToken';
import { getScheduleDateForSendWindow } from '../../application/campaign-send-schedule.utils';
import { nowUTC, startOfDayInTz, endOfDayInTz } from '../../../common/utils/date.utils';
import { getRandomArbitrary } from '../../../common/utils/randomArbitrary';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class SmsStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.SMS;
    private readonly logger = new Logger(SmsStrategy.name);

    constructor(private readonly prisma: PrismaService) {}

    async generateMessages(ctx: GenerateMessagesContext): Promise<void> {
        const { campaign, customers, sendTimeWindow } = ctx;

        const now = nowUTC();
        const startOfToday = startOfDayInTz(now);
        const endOfToday = endOfDayInTz(now);

        const useCreatives = campaign.creatives && campaign.creatives.length > 0;

        // Execução sequencial para evitar race condition no check findFirst + create:
        // com Promise.all dois workers paralelos poderiam passar pelo findFirst ao mesmo
        // tempo (ambos sem encontrar mensagem) e criar duplicatas para o mesmo cliente.
        for (const customer of customers) {
            if (!customer.phone) {
                continue;
            }

            const existingMessage = await this.prisma.message.findFirst({
                where: {
                    customerId: customer.id,
                    automaticCampaignId: campaign.id,
                    createdAt: { gte: startOfToday, lte: endOfToday },
                    status: {
                        in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT],
                    },
                },
            });

            if (existingMessage) {
                this.logger.warn(
                    `SMS já existe hoje para o cliente ${customer.name} (ID: ${customer.id})   pulando`,
                );
                continue;
            }

            let baseMessageText: string;

            if (useCreatives) {
                const creativeIndex = getRandomArbitrary(0, campaign.creatives.length);
                baseMessageText = campaign.creatives[creativeIndex].message;
            } else {
                baseMessageText = campaign.messageText;
            }

            const token = generateUniqueToken(campaign.companyId, customer.id, randomUUID());
            const trackableLink = `${process.env.REDIRECT_URL}/c/${token}`;
            const messageText = `${baseMessageText} ${trackableLink}`;

            const scheduleDate = getScheduleDateForSendWindow(sendTimeWindow, {
                smsCutoff: '21:00',
            });

            await this.prisma.message.create({
                data: {
                    customerId: customer.id,
                    automaticCampaignId: campaign.id,
                    segmentation: campaign.segmentation,
                    messageText,
                    customerName: customer.name,
                    phone: customer.phone,
                    companyId: campaign.companyId,
                    status: MessageStatus.PENDING,
                    channel: CampaignChannel.SMS,
                    attempts: 0,
                    scheduledDate: scheduleDate,
                    token,
                },
            });

            this.logger.log(`SMS agendado para o cliente ${customer.name}`);
        }
    }
}
