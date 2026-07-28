import { Injectable } from '@nestjs/common';
import { WebhookEventStatus } from '@prisma/client';
import {
  WebhookEventRecord,
  WebhookEventRepositoryPort,
} from '../../../application/webhook/ports/webhook-event.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaWebhookEventRepository implements WebhookEventRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async save(rawPayload: string, companyId: string, agentId: string): Promise<{ id: string }> {
    const row = await this.prisma.webhookEvent.create({
      data: { rawPayload, companyId, agentId },
    });
    return { id: row.id };
  }

  async findById(id: string): Promise<WebhookEventRecord | null> {
    const row = await this.prisma.webhookEvent.findUnique({
      where: { id },
      select: { id: true, rawPayload: true, companyId: true, agentId: true },
    });
    return row;
  }

  async markAsProcessing(id: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: WebhookEventStatus.PROCESSING,
        processingStartedAt: new Date(),
      },
    });
  }

  async markAsCompleted(id: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: WebhookEventStatus.COMPLETED,
        completedAt: new Date(),
      },
    });
  }

  async markAsFailed(id: string, errorMessage: string): Promise<void> {
    await this.prisma.webhookEvent.update({
      where: { id },
      data: {
        status: WebhookEventStatus.FAILED,
        errorMessage,
      },
    });
  }
}
