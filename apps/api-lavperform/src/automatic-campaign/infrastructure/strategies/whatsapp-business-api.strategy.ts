import { Injectable, Logger } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { CampaignChannel, MessageStatus, MetaTemplateStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { getRandomArbitrary } from '../../../common/utils/randomArbitrary';
import { generateUniqueToken } from '../../../common/utils/generateUniqueToken';
import { getScheduleDateForSendWindow } from '../../application/campaign-send-schedule.utils';
import { nowUTC, startOfDayInTz, endOfDayInTz } from '../../../common/utils/date.utils';
import {
    buildBodyParametersFromMappings,
    countTemplateVariables,
    extractComponentText,
    normalizeMetaTemplateVariableMappings,
    type TemplateVariableContext,
} from '../../../integrations/meta/application/meta-template-variables.utils';
import {
    GenerateMessagesContext,
    ICampaignChannelStrategy,
} from './campaign-channel.strategy.interface';

@Injectable()
export class WhatsappBusinessApiStrategy implements ICampaignChannelStrategy {
    readonly channel = CampaignChannel.WHATSAPP_BUSINESS_API;
    private readonly logger = new Logger(WhatsappBusinessApiStrategy.name);

    constructor(private readonly prisma: PrismaService) { }

    async generateMessages(ctx: GenerateMessagesContext): Promise<void> {
        if (ctx.campaign.metaMessageTemplateId) {
            await this.generateMessagesFromSelectedTemplate(ctx);
            return;
        }

        await this.generateMessagesFromCreatives(ctx);
    }

    private async generateMessagesFromSelectedTemplate(
        ctx: GenerateMessagesContext,
    ): Promise<void> {
        const { campaign, customers, sendTimeWindow } = ctx;

        const template = await this.prisma.metaMessageTemplate.findFirst({
            where: {
                id: campaign.metaMessageTemplateId!,
                companyId: campaign.companyId,
                status: MetaTemplateStatus.APPROVED,
            },
        });

        if (!template) {
            this.logger.warn(
                `Campanha ${campaign.id}: template Meta ${campaign.metaMessageTemplateId} não encontrado ou não aprovado   mensagens não serão criadas`,
            );
            return;
        }

        const mappings = normalizeMetaTemplateVariableMappings(
            campaign.metaTemplateVariableMappings,
        );
        const bodyText = extractComponentText(template.components, 'BODY') ?? '';

        const company = await this.prisma.company.findUnique({
            where: { id: campaign.companyId },
            select: { name: true },
        });
        const companyName = company?.name ?? null;

        const now = nowUTC();
        const startOfToday = startOfDayInTz(now);
        const endOfToday = endOfDayInTz(now);

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
                    },
                });

                if (existingMessage) {
                    this.logger.warn(
                        `Mensagem já existe hoje para o cliente ${customer.name} (ID: ${customer.id})   pulando`,
                    );
                    return;
                }

                const scheduleDate = getScheduleDateForSendWindow(sendTimeWindow);
                const token = generateUniqueToken(campaign.companyId, customer.id, randomUUID());
                const messageText = this.buildPreviewMessageText(
                    bodyText,
                    mappings,
                    {
                        customerName: customer.name,
                        lastOrderDate: customer.lastOrderDate,
                        companyName,
                    },
                );

                await this.prisma.message.create({
                    data: {
                        customerId: customer.id,
                        automaticCampaignId: campaign.id,
                        segmentation: campaign.segmentation,
                        messageText,
                        mediaUrl: null,
                        customerName: customer.name,
                        phone: customer.phone,
                        companyId: campaign.companyId,
                        channel: this.channel,
                        status: MessageStatus.PENDING,
                        attempts: 0,
                        scheduledDate: scheduleDate,
                        token,
                        redirectUrl: null,
                        couponCode: null,
                        metaMessageTemplateId: template.id,
                    },
                });

                this.logger.log(`Mensagem API Oficial criada para o cliente ${customer.name}`);
            }),
        );
    }

    private buildPreviewMessageText(
        bodyText: string,
        mappings: ReturnType<typeof normalizeMetaTemplateVariableMappings>,
        ctx: TemplateVariableContext,
    ): string {
        const variableCount = countTemplateVariables(bodyText);
        if (variableCount === 0) {
            return bodyText;
        }

        const values = buildBodyParametersFromMappings(variableCount, mappings, ctx);

        return values.reduce((text, value, offset) => {
            const index = offset + 1;
            return text.replace(new RegExp(`\\{\\{${index}\\}\\}`, 'g'), value);
        }, bodyText);
    }

    private async generateMessagesFromCreatives(
        ctx: GenerateMessagesContext,
    ): Promise<void> {
        const { campaign, customers, sendTimeWindow } = ctx;

        const now = nowUTC();
        const startOfToday = startOfDayInTz(now);
        const endOfToday = endOfDayInTz(now);

        const templates = await this.prisma.metaMessageTemplate.findMany({
            where: {
                companyId: campaign.companyId,
                automaticCampaignCreativeId: {
                    in: campaign.creatives.map((creative) => creative.id),
                },
                status: MetaTemplateStatus.APPROVED,
            },
            include: {
                automaticCampaignCreative: true,
            },
        });

        if (templates.length === 0) {
            this.logger.warn(
                `Campanha ${campaign.id}: nenhum template Meta aprovado encontrado   mensagens não serão criadas`,
            );
            return;
        }

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
                    },
                });

                if (existingMessage) {
                    this.logger.warn(
                        `Mensagem já existe hoje para o cliente ${customer.name} (ID: ${customer.id})   pulando`,
                    );
                    return;
                }

                const templateIndex = getRandomArbitrary(0, templates.length);
                const template = templates[templateIndex];
                const creative = template.automaticCampaignCreative;

                if (!creative) {
                    this.logger.warn(
                        `Template ${template.id} sem criativo associado   pulando cliente ${customer.name}`,
                    );
                    return;
                }

                const scheduleDate = getScheduleDateForSendWindow(sendTimeWindow);
                const token = generateUniqueToken(campaign.companyId, customer.id, randomUUID());
                const messageText = creative.message.replace(/\{\{1\}\}/g, customer.name);

                await this.prisma.message.create({
                    data: {
                        customerId: customer.id,
                        automaticCampaignId: campaign.id,
                        segmentation: campaign.segmentation,
                        messageText,
                        mediaUrl: creative.imageUrls[0] ?? null,
                        customerName: customer.name,
                        phone: customer.phone,
                        companyId: campaign.companyId,
                        channel: this.channel,
                        status: MessageStatus.PENDING,
                        attempts: 0,
                        scheduledDate: scheduleDate,
                        token,
                        redirectUrl: creative.link?.trim() || null,
                        couponCode: null,
                        metaMessageTemplateId: template.id,
                    },
                });

                this.logger.log(`Mensagem API Oficial criada para o cliente ${customer.name}`);
            }),
        );
    }
}
