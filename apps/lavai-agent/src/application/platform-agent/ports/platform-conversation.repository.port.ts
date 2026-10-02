import { MessageRole } from '../../webhook/ports/conversation.repository.port';

export const PLATFORM_CONVERSATION_REPOSITORY = Symbol('PLATFORM_CONVERSATION_REPOSITORY');

export interface PlatformConversationData {
  id: string;
  agentId: string;
  contextCompanyId: string;
  platformUserId: string;
}

export interface PlatformMessageData {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
}

export interface PlatformConversationRepositoryPort {
  upsert(input: {
    agentId: string;
    contextCompanyId: string;
    platformUserId: string;
  }): Promise<PlatformConversationData>;
  findByTrio(
    agentId: string,
    contextCompanyId: string,
    platformUserId: string,
  ): Promise<PlatformConversationData | null>;
  addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
  }): Promise<PlatformMessageData>;
  findRecentMessagesExcept(
    conversationId: string,
    excludeMessageId: string,
    limit: number,
  ): Promise<PlatformMessageData[]>;
  listLatestMessages(conversationId: string, limit: number): Promise<PlatformMessageData[]>;
}
