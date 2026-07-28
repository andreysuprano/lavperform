import { Injectable } from '@nestjs/common';
import {
  AddMessageInput,
  ConversationData,
  ConversationMessageData,
  ConversationRepositoryPort,
  MessageRole,
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
