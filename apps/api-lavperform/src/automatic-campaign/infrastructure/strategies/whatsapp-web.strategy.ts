import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CampaignChannel, MessageStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAIService } from '../../../integrations/openai/api/openai.service';
import { getRandomArbitrary } from '../../../common/utils/randomArbitrary';
import { generateUniqueToken } from '../../../common/utils/generateUniqueToken';
import { getScheduleDateForSendWindow } from '../../application/campaign-send-schedule.utils';
import { nowUTC, startOfDayInTz, endOfDayInTz } from '../../../common/utils/date.utils';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class WhatsappWebStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.WHATSAPP_WEB;
    private readonly logger = new Logger(WhatsappWebStrategy.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly openaiService: OpenAIService,
    ) { }

    async generateMessages(ctx: GenerateMessagesContext): Promise<void> {
        const { campaign, customers, sendTimeWindow } = ctx;

        const now = nowUTC();
        const startOfToday = startOfDayInTz(now);
        const endOfToday = endOfDayInTz(now);

        const hasValidCoupon =
            campaign.coupon &&
            campaign.coupon.active &&
            campaign.coupon.validUntil >= now;

        if (campaign.coupon && !hasValidCoupon) {
            this.logger.warn(
                `Campanha ${campaign.id}: cupom ${campaign.coupon.id} está inativo ou expirado   mensagens serão geradas sem o código`,
            );
        }

        const couponCode = hasValidCoupon ? campaign.coupon!.code : undefined;

        const useCreatives = campaign.creatives && campaign.creatives.length > 0;

        await Promise.all(
            customers.map(async (customer) => {
                if (!customer.phone) {
                    return;
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
                        `Mensagem já existe hoje para o cliente ${customer.name} (ID: ${customer.id})   pulando`,
                    );
                    return;
                }

                let imageUrl: string | undefined;
                let baseMessageText: string;
                let redirectUrl: string | null = null;

                if (useCreatives) {
                    const creativeIndex = getRandomArbitrary(0, campaign.creatives.length);
                    const creative = campaign.creatives[creativeIndex];

                    if (creative.imageUrls && creative.imageUrls.length > 0) {
                        const imageIndex = getRandomArbitrary(0, creative.imageUrls.length);
                        imageUrl = creative.imageUrls[imageIndex] || undefined;
                    }

                    baseMessageText = creative.message;
                    redirectUrl = creative.link?.trim() || null;
                } else {
                    const images = campaign.images
                        ? campaign.images.replaceAll(' ', '').split(',').filter(Boolean)
                        : [];
                    if (images.length > 0) {
                        const imageIndex = getRandomArbitrary(0, images.length);
                        imageUrl = images[imageIndex];
                    }
                    baseMessageText = campaign.messageText;
                }

                const scheduleDate = getScheduleDateForSendWindow(sendTimeWindow);
                const token = generateUniqueToken(campaign.companyId, customer.id, randomUUID());

                const generatedMessage = await this.openaiService.generateMessage({
                    customerName: customer.name,
                    messageText: baseMessageText,
                    linkCardapio: `${process.env.REDIRECT_URL}/c/${token}`,
                    couponCode,
                });

                await this.prisma.message.create({
                    data: {
                        customerId: customer.id,
                        automaticCampaignId: campaign.id,
                        segmentation: campaign.segmentation,
                        messageText: generatedMessage.message,
                        mediaUrl: imageUrl,
                        customerName: customer.name,
                        phone: customer.phone,
                        companyId: campaign.companyId,
                        status: MessageStatus.PENDING,
                        attempts: 0,
                        scheduledDate: scheduleDate,
                        token: token,
                        redirectUrl,
                        couponCode: couponCode ?? null,
                    },
                });

                this.logger.log(`Mensagem criada para o cliente ${customer.name}`);
            }),
        );
    }
}
