import { Injectable } from '@nestjs/common';
import { MessageRole } from '../../../application/webhook/ports/conversation.repository.port';
import type {
  PlatformConversationData,
  PlatformConversationRepositoryPort,
  PlatformMessageData,
} from '../../../application/platform-agent/ports/platform-conversation.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaPlatformConversationRepository implements PlatformConversationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: {
    agentId: string;
    contextCompanyId: string;
    platformUserId: string;
  }): Promise<PlatformConversationData> {
    const row = await this.prisma.platformConversation.upsert({
      where: {
        platform_agent_company_user: {
          agentId: input.agentId,
          contextCompanyId: input.contextCompanyId,
          platformUserId: input.platformUserId,
        },
      },
      create: input,
      update: {},
    });
    return this.mapConversation(row);
  }

  async findByTrio(
    agentId: string,
    contextCompanyId: string,
    platformUserId: string,
  ): Promise<PlatformConversationData | null> {
    const row = await this.prisma.platformConversation.findUnique({
      where: {
        platform_agent_company_user: { agentId, contextCompanyId, platformUserId },
      },
    });
    return row ? this.mapConversation(row) : null;
  }

  async addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
  }): Promise<PlatformMessageData> {
    const row = await this.prisma.platformConversationMessage.create({ data: input });
    return this.mapMessage(row);
  }

  async findRecentMessagesExcept(
    conversationId: string,
    excludeMessageId: string,
    limit: number,
  ): Promise<PlatformMessageData[]> {
    const rows = await this.prisma.platformConversationMessage.findMany({
      where: { conversationId, id: { not: excludeMessageId } },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map((row) => this.mapMessage(row));
  }

  async listLatestMessages(conversationId: string, limit: number): Promise<PlatformMessageData[]> {
    const rows = await this.prisma.platformConversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map((row) => this.mapMessage(row));
  }

  private mapConversation(row: {
    id: string;
    agentId: string;
    contextCompanyId: string;
    platformUserId: string;
  }): PlatformConversationData {
    return {
      id: row.id,
      agentId: row.agentId,
      contextCompanyId: row.contextCompanyId,
      platformUserId: row.platformUserId,
    };
  }

  private mapMessage(row: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: Date;
  }): PlatformMessageData {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as MessageRole,
      content: row.content,
      createdAt: row.createdAt,
    };
  }
}
