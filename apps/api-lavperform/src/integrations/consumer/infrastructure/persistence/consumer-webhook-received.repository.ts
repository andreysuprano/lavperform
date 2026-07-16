import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../../prisma/prisma.service';
import { IWebhookReceivedRepository } from '../../../webhooks/domain/webhook-received.repository.interface';
import { WebhookReceived } from '../../../webhooks/domain/webhook-received.entity';
import { WebhookReceivedMapper } from '../../../webhooks/infrastructure/persistence/mappers/webhook-received.mapper';

@Injectable()
export class ConsumerWebhookReceivedRepository
  implements IWebhookReceivedRepository
{
  constructor(private readonly prisma: PrismaService) {}

  async create(data: Partial<WebhookReceived>): Promise<WebhookReceived> {
    const created = await this.prisma.webhookReceived.create({
      data: data as any,
    });
    return WebhookReceivedMapper.toDomain(created);
  }

  async findAll(options?: any): Promise<WebhookReceived[]> {
    const rows = await this.prisma.webhookReceived.findMany(options);
    return rows.map(WebhookReceivedMapper.toDomain);
  }

  async findById(id: string): Promise<WebhookReceived | null> {
    const row = await this.prisma.webhookReceived.findUnique({ where: { id } });
    return row ? WebhookReceivedMapper.toDomain(row) : null;
  }

  async findByCompanyId(
    companyId: string,
    options?: any,
  ): Promise<WebhookReceived[]> {
    const rows = await this.prisma.webhookReceived.findMany({
      where: { companyId },
      ...options,
    });
    return rows.map(WebhookReceivedMapper.toDomain);
  }

  async findByPartnerId(
    partnerId: string,
    options?: any,
  ): Promise<WebhookReceived[]> {
    const rows = await this.prisma.webhookReceived.findMany({
      where: { partnerId },
      ...options,
    });
    return rows.map(WebhookReceivedMapper.toDomain);
  }

  async update(
    id: string,
    data: Partial<WebhookReceived>,
  ): Promise<WebhookReceived> {
    const updated = await this.prisma.webhookReceived.update({
      where: { id },
      data: data as any,
    });
    return WebhookReceivedMapper.toDomain(updated);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.webhookReceived.delete({ where: { id } });
  }

  async count(options?: any): Promise<number> {
    return this.prisma.webhookReceived.count(options);
  }
}
