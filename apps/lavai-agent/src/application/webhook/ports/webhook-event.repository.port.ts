export const WEBHOOK_EVENT_REPOSITORY = Symbol('WEBHOOK_EVENT_REPOSITORY');

export interface WebhookEventRecord {
  id: string;
  rawPayload: string;
  companyId: string | null;
  agentId: string | null;
}

export interface WebhookEventRepositoryPort {
  save(rawPayload: string, companyId: string, agentId: string): Promise<{ id: string }>;
  findById(id: string): Promise<WebhookEventRecord | null>;
  markAsProcessing(id: string): Promise<void>;
  markAsCompleted(id: string): Promise<void>;
  markAsFailed(id: string, errorMessage: string): Promise<void>;
}
