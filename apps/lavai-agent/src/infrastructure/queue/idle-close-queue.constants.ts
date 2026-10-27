export const IDLE_CLOSE_QUEUE_NAME = 'idle-close';

export interface IdleCloseJobData {
  conversationId: string;
  agentId: string;
  anchorMessageId: string;
}

export function buildIdleCloseJobId(conversationId: string): string {
  return `idle-close:${conversationId}`;
}
