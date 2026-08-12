import { Injectable } from '@nestjs/common';
import {
  AddMessageInput,
  ConversationData,
  ConversationMessageData,
  ConversationRepositoryPort,
  ConversationSummaryData,
  MessageRole,
  PaginatedConversations,
  UpsertConversationInput,
} from '../../../application/webhook/ports/conversation.repository.port';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PrismaConversationRepository implements ConversationRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(input: UpsertConversationInput): Promise<ConversationData> {
    const row = await this.prisma.conversation.upsert({
      where: {
        agent_chat_user: {
          agentId: input.agentId,
          chatId: input.chatId,
          userId: input.userId,
        },
      },
      update: {
        instanceToken: input.instanceToken,
        userName: input.userName,
        groupName: input.groupName,
      },
      create: {
        agentId: input.agentId,
        companyId: input.companyId,
        chatId: input.chatId,
        userId: input.userId,
        userPhone: input.userPhone,
        userName: input.userName,
        isGroup: input.isGroup,
        groupName: input.groupName,
        instanceName: input.instanceName,
        instanceToken: input.instanceToken,
      },
    });
    return this.map(row);
  }

  async findById(id: string): Promise<ConversationData | null> {
    const row = await this.prisma.conversation.findUnique({ where: { id } });
    return row ? this.map(row) : null;
  }

  async findByContext(
    agentId: string,
    chatId: string,
    userId: string,
  ): Promise<ConversationData | null> {
    const row = await this.prisma.conversation.findUnique({
      where: {
        agent_chat_user: { agentId, chatId, userId },
      },
    });
    return row ? this.map(row) : null;
  }

  async findRecentMessages(
    conversationId: string,
    limit: number,
  ): Promise<ConversationMessageData[]> {
    const rows = await this.prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return rows.reverse().map(this.mapMessage);
  }

  async addMessage(input: AddMessageInput): Promise<ConversationMessageData> {
    const row = await this.prisma.conversationMessage.create({
      data: {
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        originalType: input.originalType,
      },
    });
    return this.mapMessage(row);
  }

  async listByAgentId(
    agentId: string,
    options: { page: number; limit: number },
  ): Promise<PaginatedConversations> {
    const page = Math.max(1, options.page);
    const limit = Math.min(100, Math.max(1, options.limit));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      this.prisma.conversation.findMany({
        where: { agentId },
        orderBy: { updatedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          userName: true,
          userPhone: true,
          isGroup: true,
          groupName: true,
          updatedAt: true,
          messages: {
            where: { role: { not: MessageRole.SYSTEM } },
            orderBy: { createdAt: 'desc' },
            take: 1,
            select: { content: true, role: true, createdAt: true },
          },
        },
      }),
      this.prisma.conversation.count({ where: { agentId } }),
    ]);

    const data: ConversationSummaryData[] = rows.map((row) => {
      const last = row.messages[0];
      return {
        id: row.id,
        userName: row.userName,
        userPhone: row.userPhone,
        isGroup: row.isGroup,
        groupName: row.groupName,
        updatedAt: row.updatedAt,
        lastMessage: last
          ? {
              content: last.content,
              role: last.role as MessageRole,
              createdAt: last.createdAt,
            }
          : null,
      };
    });

    return { data, total, page, limit };
  }

  async findViewableMessages(
    conversationId: string,
  ): Promise<ConversationMessageData[]> {
    const rows = await this.prisma.conversationMessage.findMany({
      where: {
        conversationId,
        role: { not: MessageRole.SYSTEM },
      },
      orderBy: { createdAt: 'asc' },
    });
    return rows.map(this.mapMessage);
  }

  // ─── Mappers ──────────────────────────────────────────────────────────────

  private map(row: {
    id: string; agentId: string; companyId: string; chatId: string; userId: string;
    userPhone: string; userName: string; isGroup: boolean; groupName: string | null;
    instanceName: string; instanceToken: string; createdAt: Date; updatedAt: Date;
  }): ConversationData {
    return {
      id: row.id,
      agentId: row.agentId,
      companyId: row.companyId,
      chatId: row.chatId,
      userId: row.userId,
      userPhone: row.userPhone,
      userName: row.userName,
      isGroup: row.isGroup,
      groupName: row.groupName,
      instanceName: row.instanceName,
      instanceToken: row.instanceToken,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapMessage(row: {
    id: string; conversationId: string; role: string;
    content: string; originalType: string | null; createdAt: Date;
  }): ConversationMessageData {
    return {
      id: row.id,
      conversationId: row.conversationId,
      role: row.role as MessageRole,
      content: row.content,
      originalType: row.originalType,
      createdAt: row.createdAt,
    };
  }
}
