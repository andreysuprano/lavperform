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
    targetAgentId?: string;
  }): Promise<PlatformConversationData> {
    const targetAgentId = input.targetAgentId ?? '';
    const row = await this.prisma.platformConversation.upsert({
      where: {
        platform_agent_company_user_target: {
          agentId: input.agentId,
          contextCompanyId: input.contextCompanyId,
          platformUserId: input.platformUserId,
          targetAgentId,
        },
      },
      create: {
        agentId: input.agentId,
        contextCompanyId: input.contextCompanyId,
        platformUserId: input.platformUserId,
        targetAgentId,
      },
      update: {},
    });
    return this.mapConversation(row);
  }

  async findByTrio(
    agentId: string,
    contextCompanyId: string,
    platformUserId: string,
    targetAgentId = '',
  ): Promise<PlatformConversationData | null> {
    const row = await this.prisma.platformConversation.findUnique({
      where: {
        platform_agent_company_user_target: {
          agentId,
          contextCompanyId,
          platformUserId,
          targetAgentId,
        },
      },
    });
    return row ? this.mapConversation(row) : null;
  }

  async addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    blocksJson?: string | null;
    proposalStatus?: string | null;
  }): Promise<PlatformMessageData> {
    const row = await this.prisma.platformConversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        blocksJson: input.blocksJson,
        proposalStatus: input.proposalStatus,
      },
    });
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

  async findMessage(id: string): Promise<(PlatformMessageData & { conversation: PlatformConversationData }) | null> {
    const row = await this.prisma.platformConversationMessage.findUnique({
      where: { id },
      include: { conversation: true },
    });
    if (!row) return null;
    return { ...this.mapMessage(row), conversation: this.mapConversation(row.conversation) };
  }

  async updateProposalStatus(id: string, proposalStatus: string): Promise<void> {
    await this.prisma.platformConversationMessage.update({
      where: { id },
      data: { proposalStatus },
    });
  }

  private mapConversation(row: {
    id: string;
    agentId: string;
    contextCompanyId: string;
    platformUserId: string;
    targetAgentId: string;
  }): PlatformConversationData {
    return {
      id: row.id,
      agentId: row.agentId,
      contextCompanyId: row.contextCompanyId,
      platformUserId: row.platformUserId,
      targetAgentId: row.targetAgentId,
    };
  }

  private mapMessage(row: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    createdAt: Date;
    blocksJson?: string | null;
    proposalStatus?: string | null;
  }): PlatformMessageData {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as MessageRole,
      content: row.content,
      createdAt: row.createdAt,
      blocksJson: row.blocksJson ?? null,
      proposalStatus: row.proposalStatus ?? null,
    };
  }
}
