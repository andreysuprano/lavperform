export const AGENT_RUN_QUERY_PORT = 'AGENT_RUN_QUERY_PORT';

export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';
export type AgentRunStepType = 'LLM_CALL' | 'TOOL_CALL' | 'MCP_TOOL_CALL' | 'RAG_SEARCH' | 'ERROR';

export interface RunFilters {
  agentId?: string;
  companyId?: string;
  conversationId?: string;
  status?: AgentRunStatus;
  page?: number;
  limit?: number;
}

export interface AgentRunStepData {
  id: string;
  agentRunId: string;
  stepType: AgentRunStepType;
  toolName: string | null;
  input: unknown;
  output: unknown;
  errorMessage: string | null;
  durationMs: number | null;
  iteration: number;
  createdAt: Date;
}

export interface AgentRunSummary {
  id: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  status: AgentRunStatus;
  inputPrompt: string | null;
  errorMessage: string | null;
  startedAt: Date;
  finishedAt: Date | null;
  durationMs: number | null;
  iterations: number;
  totalToolCalls: number;
}

export interface AgentRunDetail extends AgentRunSummary {
  outputText: string | null;
  steps: AgentRunStepData[];
}

export interface PaginatedAgentRuns {
  data: AgentRunSummary[];
  total: number;
  page: number;
  limit: number;
}

export interface AgentRunQueryPort {
  findMany(filters: RunFilters): Promise<PaginatedAgentRuns>;
  findById(id: string): Promise<AgentRunDetail | null>;
}
