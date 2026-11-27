import { MessageRole } from '../../webhook/ports/conversation.repository.port';

export const PLATFORM_CONVERSATION_REPOSITORY = Symbol('PLATFORM_CONVERSATION_REPOSITORY');

export interface PlatformConversationData {
  id: string;
  agentId: string;
  contextCompanyId: string;
  platformUserId: string;
  targetAgentId: string;
}

export interface PlatformMessageData {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  createdAt: Date;
  blocksJson?: string | null;
  proposalStatus?: string | null;
}

export interface PlatformConversationRepositoryPort {
  upsert(input: {
    agentId: string;
    contextCompanyId: string;
    platformUserId: string;
    targetAgentId?: string;
  }): Promise<PlatformConversationData>;
  findByTrio(
    agentId: string,
    contextCompanyId: string,
    platformUserId: string,
    targetAgentId?: string,
  ): Promise<PlatformConversationData | null>;
  addMessage(input: {
    conversationId: string;
    role: MessageRole;
    content: string;
    blocksJson?: string | null;
    proposalStatus?: string | null;
  }): Promise<PlatformMessageData>;
  findRecentMessagesExcept(
    conversationId: string,
    excludeMessageId: string,
    limit: number,
  ): Promise<PlatformMessageData[]>;
  listLatestMessages(conversationId: string, limit: number): Promise<PlatformMessageData[]>;
  listMessagesAscending(conversationId: string): Promise<PlatformMessageData[]>;
  listByTarget(
    configuratorAgentId: string,
    contextCompanyId: string,
    targetAgentId: string,
  ): Promise<PlatformConversationData[]>;
  /** Pares únicos (lavanderia, agente público) com histórico no configurador. */
  listDistinctConfiguratorTargets(
    configuratorAgentId: string,
  ): Promise<Array<{ contextCompanyId: string; targetAgentId: string }>>;
  findMessage(id: string): Promise<(PlatformMessageData & { conversation: PlatformConversationData }) | null>;
  updateProposalStatus(id: string, proposalStatus: string): Promise<void>;
}
