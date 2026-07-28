export const FOLLOW_UP_QUEUE_NAME = 'follow-up';

export interface FollowUpJobData {
  journeyId: string;
  stepId: string;
  agentId: string;
  conversationId: string;
  scheduledFor: string;
}

export function buildFollowUpJobId(journeyId: string, stepId: string): string {
  return `followup:${journeyId}:${stepId}`;
}
