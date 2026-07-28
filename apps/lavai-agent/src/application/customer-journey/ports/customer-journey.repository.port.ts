export const CUSTOMER_JOURNEY_REPOSITORY = Symbol('CUSTOMER_JOURNEY_REPOSITORY');
export const HELP_REQUEST_REPOSITORY = Symbol('HELP_REQUEST_REPOSITORY');

export interface CustomerJourneyData {
  id: string;
  agentId: string;
  conversationId: string;
  userPhone: string;
  status: string;
  startedAt: Date;
  purchaseAt: Date | null;
  helpRequestedAt: Date | null;
  metadata: Record<string, unknown>;
}

export interface HelpRequestData {
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
}

export interface CreateCustomerJourneyInput {
  agentId: string;
  conversationId: string;
  userPhone: string;
}

export interface CustomerJourneyRepositoryPort {
  create(input: CreateCustomerJourneyInput): Promise<CustomerJourneyData>;
  findByConversationId(conversationId: string): Promise<CustomerJourneyData | null>;
  findActiveByAgentAndPhone(
    agentId: string,
    userPhone: string,
  ): Promise<CustomerJourneyData | null>;
  findPurchasedByAgentAndPhone(
    agentId: string,
    userPhone: string,
    orderId?: string,
  ): Promise<CustomerJourneyData | null>;
  updateStatus(
    id: string,
    status: string,
    extra?: { purchaseAt?: Date; helpRequestedAt?: Date; metadata?: Record<string, unknown> },
  ): Promise<CustomerJourneyData>;
}

export interface HelpRequestRepositoryPort {
  create(input: {
    agentId: string;
    companyId: string;
    conversationId: string;
    userName: string;
    userPhone: string;
    chatId: string;
    lastMessage?: string;
  }): Promise<HelpRequestData>;
  findPendingDuplicate(
    agentId: string,
    conversationId: string,
    withinMinutes: number,
  ): Promise<HelpRequestData | null>;
  findById(id: string): Promise<HelpRequestData | null>;
  findByAgentAndStatus(agentId: string, status: string): Promise<HelpRequestData[]>;
  updateStatus(
    id: string,
    status: string,
    extra?: { claimedAt?: Date; resolvedAt?: Date },
  ): Promise<HelpRequestData>;
}
