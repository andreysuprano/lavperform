import { Injectable } from '@nestjs/common';
import {
  CreateCustomerJourneyInput,
  CustomerJourneyData,
  CustomerJourneyRepositoryPort,
} from '../../../application/customer-journey/ports/customer-journey.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaCustomerJourneyRepository implements CustomerJourneyRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateCustomerJourneyInput): Promise<CustomerJourneyData> {
    const row = await this.prisma.customerJourney.create({
      data: {
        agentId: input.agentId,
        conversationId: input.conversationId,
        userPhone: input.userPhone,
      },
    });
    return this.map(row);
  }

  async findByConversationId(conversationId: string): Promise<CustomerJourneyData | null> {
    const row = await this.prisma.customerJourney.findUnique({ where: { conversationId } });
    return row ? this.map(row) : null;
  }

  async findActiveByAgentAndPhone(
    agentId: string,
    userPhone: string,
  ): Promise<CustomerJourneyData | null> {
    const normalized = this.normalizePhone(userPhone);
    const rows = await this.prisma.customerJourney.findMany({
      where: { agentId, status: 'ACTIVE' },
      orderBy: { startedAt: 'desc' },
    });
    const match = rows.find((r) => this.normalizePhone(r.userPhone) === normalized);
    return match ? this.map(match) : null;
  }

  async findPurchasedByAgentAndPhone(
    agentId: string,
    userPhone: string,
    orderId?: string,
  ): Promise<CustomerJourneyData | null> {
    const normalized = this.normalizePhone(userPhone);
    const rows = await this.prisma.customerJourney.findMany({
      where: { agentId, status: 'PURCHASED' },
      orderBy: { purchaseAt: 'desc' },
    });
    const match = rows.find((r) => {
      if (this.normalizePhone(r.userPhone) !== normalized) return false;
      if (orderId) {
        const meta = r.metadata as Record<string, unknown>;
        return meta?.orderId === orderId;
      }
      return true;
    });
    return match ? this.map(match) : null;
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { purchaseAt?: Date; helpRequestedAt?: Date; metadata?: Record<string, unknown> },
  ): Promise<CustomerJourneyData> {
    const row = await this.prisma.customerJourney.update({
      where: { id },
      data: {
        status: status as never,
        ...(extra?.purchaseAt !== undefined ? { purchaseAt: extra.purchaseAt } : {}),
        ...(extra?.helpRequestedAt !== undefined ? { helpRequestedAt: extra.helpRequestedAt } : {}),
        ...(extra?.metadata !== undefined
          ? { metadata: extra.metadata as object }
          : {}),
      },
    });
    return this.map(row);
  }

  private normalizePhone(phone: string): string {
    return phone.replace(/\D/g, '');
  }

  private map(row: {
    id: string;
    agentId: string;
    conversationId: string;
    userPhone: string;
    status: string;
    startedAt: Date;
    purchaseAt: Date | null;
    helpRequestedAt: Date | null;
    metadata: unknown;
  }): CustomerJourneyData {
    return {
      id: row.id,
      agentId: row.agentId,
      conversationId: row.conversationId,
      userPhone: row.userPhone,
      status: row.status,
      startedAt: row.startedAt,
      purchaseAt: row.purchaseAt,
      helpRequestedAt: row.helpRequestedAt,
      metadata: (row.metadata as Record<string, unknown>) ?? {},
    };
  }
}
