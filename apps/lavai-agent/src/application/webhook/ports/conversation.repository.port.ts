export const CONVERSATION_REPOSITORY = Symbol('CONVERSATION_REPOSITORY');

export enum MessageRole {
  USER = 'USER',
  ASSISTANT = 'ASSISTANT',
  SYSTEM = 'SYSTEM',
}

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface ConversationData {
  id: string;
  agentId: string;
  companyId: string;
  chatId: string;
  userId: string;
  userPhone: string;
  userName: string;
  isGroup: boolean;
  groupName: string | null;
  instanceName: string;
  instanceToken: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessageData {
  id: string;
  conversationId: string;
  role: MessageRole;
  content: string;
  originalType: string | null;
  createdAt: Date;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface UpsertConversationInput {
  agentId: string;
  companyId: string;
  chatId: string;
  userId: string;
  userPhone: string;
  userName: string;
  isGroup: boolean;
  groupName?: string;
  instanceName: string;
  instanceToken: string;
}

export interface AddMessageInput {
  conversationId: string;
  role: MessageRole;
  content: string;
  originalType?: string;
}

// ─── Repository interface ─────────────────────────────────────────────────────

export interface ConversationRepositoryPort {
  /**
   * Busca ou cria a conversa para o trio (agentId, chatId, userId).
   * Atualiza instanceToken e userName caso já exista.
   */
  upsert(input: UpsertConversationInput): Promise<ConversationData>;

  findById(id: string): Promise<ConversationData | null>;

  findByContext(
    agentId: string,
    chatId: string,
    userId: string,
  ): Promise<ConversationData | null>;

  /**
   * Retorna as últimas `limit` mensagens da conversa, em ordem cronológica.
   */
  findRecentMessages(conversationId: string, limit: number): Promise<ConversationMessageData[]>;

  addMessage(input: AddMessageInput): Promise<ConversationMessageData>;
}
