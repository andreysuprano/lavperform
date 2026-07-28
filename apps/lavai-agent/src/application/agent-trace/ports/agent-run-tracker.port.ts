export const AGENT_RUN_TRACKER_PORT = 'AGENT_RUN_TRACKER_PORT';

export type AgentRunStepType =
  | 'LLM_CALL'
  | 'TOOL_CALL'
  | 'MCP_TOOL_CALL'
  | 'RAG_SEARCH'
  | 'ERROR';

export interface StartRunData {
  agentId: string;
  companyId: string;
  conversationId: string;
  inputPrompt?: string;
}

export interface AddStepData {
  stepType: AgentRunStepType;
  toolName?: string;
  input?: unknown;
  output?: unknown;
  errorMessage?: string;
  durationMs?: number;
  iteration?: number;
}

export interface AgentRunTrackerPort {
  startRun(data: StartRunData): Promise<string>;
  addStep(runId: string, step: AddStepData): Promise<void>;
  completeRun(runId: string, outputText: string, iterations: number, totalToolCalls: number): Promise<void>;
  failRun(runId: string, errorMessage: string): Promise<void>;
}
