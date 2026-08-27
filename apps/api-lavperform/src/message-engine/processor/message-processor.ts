import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { Logger, Optional } from '@nestjs/common';
import { Message, Customer, Campaign, MessageStatus, AutomaticCampaign, CampaignChannel, MetaTemplateStatus, Prisma } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { WhatsappService } from 'src/whatsapp/application/whatsapp.service';
import { MetaMessagingService } from 'src/integrations/meta/application/meta-messaging.service';
import { MetaTemplateMessageComponent } from 'src/integrations/meta/api/meta-messaging.client';
import {
    buildBodyParametersFromMappings,
    countTemplateVariables,
    extractComponentText,
    normalizeMetaTemplateVariableMappings,
} from 'src/integrations/meta/application/meta-template-variables.utils';
import { DisparoProClient } from 'src/integrations/disparo-pro/api/disparo-pro.client';
import { EventEmitter2 } from '@nestjs/event-emitter';
import {
    CREDITS_CONSUME_REQUESTED_EVENT,
    CreditsConsumeRequestedPayload,
} from 'src/credits/domain/credits.events';
import { RenitencyEvaluatorService } from 'src/renitency/application/renitency-evaluator.service';
import { endOfDayInTz, nowUTC, startOfDayInTz } from 'src/common/utils/date.utils';
import { extractErrorMessage } from 'src/common/utils/error.utils';
import { CAMPAIGN_PAUSED_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';

interface MessageProcessorData {
    message: Message;
    customer: Customer;
    campaign: Campaign;
    automaticCampaign?: AutomaticCampaign;
}

@Processor(QUEUE_NAMES.MESSAGE_ENGINE)
export class MessageProcessor {
    private readonly logger = new Logger(MessageProcessor.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly whatsappService: WhatsappService,
        private readonly eventEmitter: EventEmitter2,
        private readonly renitencyEvaluator: RenitencyEvaluatorService,
        @Optional()
        private readonly metaMessagingService?: MetaMessagingService,
        @Optional()
        private readonly disparoProClient?: DisparoProClient,
    ) {
    }

    @Process({ name: QUEUE_NAMES.MESSAGE_ENGINE, concurrency: 10 })
    async process(job: Job<MessageProcessorData>) {
        const { message, customer } = job.data;

        const fresh = await this.prisma.message.findUnique({
            where: { id: message.id },
            select: { id: true, status: true, automaticCampaignId: true },
        });
        if (!fresh || fresh.status !== MessageStatus.PROCESSING) {
            this.logger.warn(`Mensagem ${message.id} ignorada (status=${fresh?.status})`);
            return;
        }

        if (fresh.automaticCampaignId) {
            const campaignRow = await this.prisma.automaticCampaign.findUnique({
                where: { id: fresh.automaticCampaignId },
                select: { id: true, active: true },
            });
            if (!campaignRow?.active) {
                await this.prisma.message.update({
                    where: { id: message.id },
                    data: {
                        status: MessageStatus.ABORTED,
                        error: CAMPAIGN_PAUSED_ABORT_ERROR,
                    },
                });
                return;
            }
        }

        if (this.renitencyEvaluator.shouldApplyRenitency(message)) {
            const check = await this.renitencyEvaluator.canContactCustomer({
                companyId: message.companyId,
                customerId: message.customerId,
                channel: message.channel,
                campaignId: message.campaignId,
                automaticCampaignId: message.automaticCampaignId,
                weatherAlertHistoryId: message.weatherAlertHistoryId,
            });
            if (!check.allowed) {
                const now = nowUTC();
                const startOfToday = startOfDayInTz(now);
                const endOfToday = endOfDayInTz(now);

                const duplicateForSameCampaign = message.automaticCampaignId
                    ? await this.prisma.message.findFirst({
                        where: {
                            id: { not: message.id },
                            automaticCampaignId: message.automaticCampaignId,
                            customerId: message.customerId,
                            createdAt: { gte: startOfToday, lte: endOfToday },
                            status: {
                                in: [
                                    MessageStatus.SENT,
                                    MessageStatus.PROCESSING,
                                    MessageStatus.PENDING,
                                ],
                            },
                        },
                        select: { id: true },
                    })
                    : null;

                if (duplicateForSameCampaign) {
                    this.logger.warn(
                        `Mensagem ${message.id} abortada por duplicidade na campanha ${message.automaticCampaignId}`,
                    );
                    await this.prisma.message.update({
                        where: { id: message.id },
                        data: {
                            status: MessageStatus.ABORTED,
                            error: 'Mensagem duplicada para o mesmo cliente na campanha hoje',
                            updatedAt: new Date(),
                        },
                    });
                    return;
                }

                if (check.nextEligibleAt) {
                    this.logger.warn(
                        `Mensagem ${message.id} reagendada por renitência para ${check.nextEligibleAt.toISOString()}: ${check.reason}`,
                    );
                    await this.prisma.message.update({
                        where: { id: message.id },
                        data: {
                            status: MessageStatus.PENDING,
                            scheduledDate: check.nextEligibleAt,
                            error: check.reason,
                            updatedAt: new Date(),
                        },
                    });
                    return;
                }

                this.logger.warn(`Mensagem ${message.id} bloqueada por renitência: ${check.reason}`);
                await this.prisma.message.update({
                    where: { id: message.id },
                    data: { status: MessageStatus.ABORTED, error: check.reason, updatedAt: new Date() },
                });
                return;
            }
        }

        try {
            if (message.channel === CampaignChannel.SMS) {
                await this.sendSmsMessage(message, customer);
                return;
            }

            const automaticCampaign = message.automaticCampaignId
                ? await this.prisma.automaticCampaign.findUnique({
                    where: { id: message.automaticCampaignId },
                })
                : null;

            if (automaticCampaign?.channel === CampaignChannel.WHATSAPP_BUSINESS_API) {
                await this.sendMetaTemplateMessage(message, customer, automaticCampaign);
                return;
            }

            const instance = await this.prisma.whatsappInstance.findFirst({
                where: { companyId: customer.companyId }
            });

            if (!instance) {
                throw new Error('Instância não encontrada');
            }

            if (message.mediaUrl) {
                await this.whatsappService.sendMessageWithImage(message.phone, message.messageText, message.mediaUrl, instance.token);
                this.logger.log(`Mensagem com imagem enviada para ${message.phone}`);
            } else {
                await this.whatsappService.sendTextMessage(message.phone, message.messageText, instance.token);
                this.logger.log(`Mensagem de texto enviada para ${message.phone}`);
            }

            await this.markSentIfStillProcessing(message, customer);
        } catch (error) {
            await this.prisma.message.update({
                where: {
                    id: message.id
                },
                data: {
                    error: extractErrorMessage(error),
                    status: MessageStatus.ERROR,
                    updatedAt: new Date()
                }
            });

            if (message.automaticCampaignId) {
                await this.prisma.campaignMetric.updateMany({
                    where: {
                        automaticCampaignId: message.automaticCampaignId
                    },
                    data: {
                        messagesError: { increment: 1 },
                    }
                });
            }
            else {
                await this.prisma.campaignMetric.updateMany({
                    where: {
                        campaignId: message.campaignId,
                    },
                    data: {
                        messagesError: { increment: 1 },
                    }
                });
            }
        }
    }

    private async markSentIfStillProcessing(message: Message, customer: Customer): Promise<boolean> {
        const result = await this.prisma.message.updateMany({
            where: { id: message.id, status: MessageStatus.PROCESSING },
            data: {
                status: MessageStatus.SENT,
                attempts: 1,
                updatedAt: new Date(),
            },
        });

        if (result.count === 0) {
            return false;
        }

        if (message.automaticCampaignId) {
            await this.prisma.campaignMetric.updateMany({
                where: { automaticCampaignId: message.automaticCampaignId },
                data: { messagesSent: { increment: 1 } },
            });
        } else {
            await this.prisma.campaignMetric.updateMany({
                where: { campaignId: message.campaignId },
                data: { messagesSent: { increment: 1 } },
            });
        }

        await this.prisma.customer.updateMany({
            where: { id: customer.id },
            data: { lastContactDate: new Date() },
        });

        return true;
    }

    private async hassufficientSmsCredits(companyId: string): Promise<boolean> {
        const smsProduct =
            (await this.prisma.creditProduct.findFirst({
                where: { companyId, code: 'SMS', active: true, deletedAt: null },
            })) ??
            (await this.prisma.defaultCreditProduct.findFirst({
                where: { code: 'SMS', active: true, deletedAt: null },
            }));

        if (!smsProduct) {
            return true;
        }

        const wallet = await this.prisma.companyCreditWallet.findUnique({
            where: { companyId },
        });

        return (wallet?.balanceCents ?? 0) >= smsProduct.priceCents;
    }

    private async abortMessageWithError(message: Message, errorMsg: string): Promise<void> {
        await this.prisma.message.update({
            where: { id: message.id },
            data: {
                status: MessageStatus.ERROR,
                error: errorMsg,
                updatedAt: new Date(),
            },
        });

        if (message.automaticCampaignId) {
            await this.prisma.campaignMetric.updateMany({
                where: { automaticCampaignId: message.automaticCampaignId },
                data: { messagesError: { increment: 1 } },
            });
        } else if (message.campaignId) {
            await this.prisma.campaignMetric.updateMany({
                where: { campaignId: message.campaignId },
                data: { messagesError: { increment: 1 } },
            });
        }
    }

    private async sendSmsMessage(
        message: Message,
        customer: Customer,
    ): Promise<void> {
        if (!this.disparoProClient) {
            throw new Error('DisparoProClient não configurado no MessageProcessor');
        }

        const hasSufficientCredits = await this.hassufficientSmsCredits(message.companyId);
        if (!hasSufficientCredits) {
            this.logger.warn(`Empresa ${message.companyId} sem créditos SMS   mensagem ${message.id} abortada`);
            await this.abortMessageWithError(message, 'Sem créditos suficientes, efetue uma recarga!');
            return;
        }

        await this.disparoProClient.sendSms(message.phone, message.messageText, message.companyId);
        this.logger.log(`SMS enviado para ${message.phone} (empresa: ${message.companyId})`);

        const markedSent = await this.markSentIfStillProcessing(message, customer);
        if (!markedSent) {
            return;
        }

        const creditsPayload: CreditsConsumeRequestedPayload = {
            companyId: message.companyId,
            productCode: 'SMS',
            metadata: {
                messageId: message.id,
                phone: message.phone,
                automaticCampaignId: message.automaticCampaignId ?? undefined,
                campaignId: message.campaignId ?? undefined,
            },
        };
        this.eventEmitter.emit(CREDITS_CONSUME_REQUESTED_EVENT, creditsPayload);
        this.logger.log(`Evento de consumo de créditos emitido para empresa ${message.companyId} (SMS)`);
    }

    private async sendMetaTemplateMessage(
        message: Message,
        customer: Customer,
        campaign: AutomaticCampaign,
    ): Promise<void> {
        if (!message.metaMessageTemplateId) {
            throw new Error('Mensagem de API Oficial sem template associado');
        }

        const template = await this.prisma.metaMessageTemplate.findFirst({
            where: {
                id: message.metaMessageTemplateId,
                companyId: campaign.companyId,
            },
        });

        if (!template) {
            throw new Error('Template Meta não encontrado para a mensagem');
        }

        if (template.status !== MetaTemplateStatus.APPROVED) {
            throw new Error(`Template Meta ${template.id} não aprovado: ${template.status}`);
        }

        if (!this.metaMessagingService) {
            throw new Error('MetaMessagingService não configurado no MessageProcessor');
        }

        const company = await this.prisma.company.findUnique({
            where: { id: campaign.companyId },
            select: { name: true },
        });

        const components = await this.buildTemplateMessageComponents(
            template.components,
            message,
            campaign,
            customer,
            company?.name ?? null,
            template.headerMediaUrl,
        );

        await this.metaMessagingService.sendTemplateMessage(
            campaign.companyId,
            message.phone,
            template.name,
            template.language,
            components,
        );
        this.logger.log(`Mensagem Meta enviada para ${message.phone}`);

        await this.markSentIfStillProcessing(message, customer);
    }

    private async buildTemplateMessageComponents(
        components: Prisma.JsonValue,
        message: Message,
        campaign: AutomaticCampaign,
        customer: Customer,
        companyName: string | null,
        templateHeaderMediaUrl?: string | null,
    ): Promise<MetaTemplateMessageComponent[]> {
        if (!Array.isArray(components)) {
            return [];
        }

        const runtimeComponents: MetaTemplateMessageComponent[] = [];

        const hasImageHeader = components.some((component) => {
            if (!component || typeof component !== 'object') return false;
            const record = component as Record<string, unknown>;
            return record.type === 'HEADER' && record.format === 'IMAGE';
        });

        const headerMediaUrl = message.mediaUrl ?? templateHeaderMediaUrl ?? null

        if (hasImageHeader && headerMediaUrl) {
            if (!this.metaMessagingService) {
                throw new Error('MetaMessagingService não configurado no MessageProcessor');
            }

            const mediaId = await this.metaMessagingService.uploadMediaIdFromUrl(
                campaign.companyId,
                headerMediaUrl,
            );

            runtimeComponents.push({
                type: 'header',
                parameters: [
                    {
                        type: 'image',
                        image: { id: mediaId },
                    },
                ],
            });
        }

        const bodyText = extractComponentText(components, 'BODY') ?? '';
        const variableCount = countTemplateVariables(bodyText);

        if (variableCount > 0) {
            const mappings = normalizeMetaTemplateVariableMappings(
                campaign.metaTemplateVariableMappings,
            );
            const bodyParameters = buildBodyParametersFromMappings(
                variableCount,
                mappings,
                {
                    customerName: message.customerName,
                    lastOrderDate: customer.lastOrderDate,
                    companyName,
                },
            );

            runtimeComponents.push({
                type: 'body',
                parameters: bodyParameters.map((text) => ({
                    type: 'text' as const,
                    text,
                })),
            });
        }

        return runtimeComponents;
    }
} 