import { Injectable } from '@nestjs/common';
import {
  HelpRequestData,
  HelpRequestRepositoryPort,
} from '../../../application/customer-journey/ports/customer-journey.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaHelpRequestRepository implements HelpRequestRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: {
    agentId: string;
    companyId: string;
    conversationId: string;
    userName: string;
    userPhone: string;
    chatId: string;
    lastMessage?: string;
  }): Promise<HelpRequestData> {
    const row = await this.prisma.helpRequest.create({ data: input });
    return this.map(row);
  }

  async findPendingDuplicate(
    agentId: string,
    conversationId: string,
    withinMinutes: number,
  ): Promise<HelpRequestData | null> {
    const since = new Date(Date.now() - withinMinutes * 60 * 1000);
    const row = await this.prisma.helpRequest.findFirst({
      where: {
        agentId,
        conversationId,
        status: 'PENDING',
        requestedAt: { gte: since },
      },
      orderBy: { requestedAt: 'desc' },
    });
    return row ? this.map(row) : null;
  }

  async findById(id: string): Promise<HelpRequestData | null> {
    const row = await this.prisma.helpRequest.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByAgentAndStatus(agentId: string, status: string): Promise<HelpRequestData[]> {
    const rows = await this.prisma.helpRequest.findMany({
      where: { agentId, status: status as never },
      orderBy: { requestedAt: 'asc' },
    });
    return rows.map((r) => this.map(r));
  }

  async updateStatus(
    id: string,
    status: string,
    extra?: { claimedAt?: Date; resolvedAt?: Date },
  ): Promise<HelpRequestData> {
    const row = await this.prisma.helpRequest.update({
      where: { id },
      data: {
        status: status as never,
        claimedAt: extra?.claimedAt,
        resolvedAt: extra?.resolvedAt,
      },
    });
    return this.map(row);
  }

  private map(row: {
    id: string;
    agentId: string;
    companyId: string;
    conversationId: string;
    userName: string;
    userPhone: string;
    chatId: string;
    lastMessage: string | null;
    status: string;
    requestedAt: Date;
    claimedAt: Date | null;
    resolvedAt: Date | null;
  }): HelpRequestData {
    return { ...row };
  }
}
