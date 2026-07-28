export const WEBHOOK_QUEUE_PORT = Symbol('WEBHOOK_QUEUE_PORT');

export interface WebhookQueuePort {
  enqueue(webhookEventId: string, agentId: string): Promise<string>;
}
