export const PROMPT_STUDIO_THREAD_REPOSITORY = Symbol('PROMPT_STUDIO_THREAD_REPOSITORY');

export type PromptStudioMessageRole = 'USER' | 'SPECIALIST';

export interface PromptStudioThreadRecord {
  id: string;
}

export interface PromptStudioMessageRecord {
  threadId?: string;
  role: PromptStudioMessageRole;
  content: string;
  proposalJson: string | null;
}

export interface PromptStudioThreadRepository {
  getOrCreate(agentId: string): Promise<PromptStudioThreadRecord>;
  listMessages(threadId: string): Promise<PromptStudioMessageRecord[]>;
  appendMessage(message: PromptStudioMessageRecord & { threadId: string }): Promise<void>;
  clearPendingProposal(threadId: string): Promise<void>;
}
