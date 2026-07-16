import { WebhookReceived as PrismaWebhookReceived } from '@prisma/client';
import { WebhookReceived } from '../../../domain/webhook-received.entity';

export class WebhookReceivedMapper {
    static toDomain(prismaWebhook: PrismaWebhookReceived): WebhookReceived {
        return new WebhookReceived({
            id: prismaWebhook.id,
            companyId: prismaWebhook.companyId,
            partnerId: prismaWebhook.partnerId,
            data: prismaWebhook.data,
            createdAt: prismaWebhook.createdAt,
            updatedAt: prismaWebhook.updatedAt,
        });
    }
}
