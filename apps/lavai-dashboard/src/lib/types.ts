export interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentData {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPersona {
  personaName: string;
  personaDescription: string | null;
  systemPrompt: string;
  behaviorGuidelines: string | null;
  guardrails: string | null;
  contextPrompt: string | null;
  welcomeMessage: string | null;
  voiceTone: 'FORMAL' | 'INFORMAL' | 'FRIENDLY' | 'PROFESSIONAL' | 'EMPATHETIC' | 'ASSERTIVE';
  communicationStyle: 'CONCISE' | 'DETAILED' | 'TECHNICAL' | 'SIMPLIFIED' | 'BALANCED';
  language: 'PT_BR' | 'EN_US' | 'ES_ES';
}

export interface AgentModelConfig {
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streaming: boolean;
}

export interface LLMModel {
  id: string;
  name: string;
  description?: string;
  contextLength?: number;
  pricing?: {
    prompt: string;
    completion: string;
  };
}

export interface AgentMemoryConfig {
  memoryType: 'BUFFER' | 'SUMMARY' | 'VECTOR' | 'NONE';
  windowSize: number;
  maxSummaryTokens: number;
  useLongTermMemory: boolean;
}

export interface AgentMediaConfig {
  audioEnabled: boolean;
  audioDefaultMessage: string | null;
  imageEnabled: boolean;
  imageExtractionPrompt: string | null;
  imageDefaultMessage: string | null;
  videoEnabled: boolean;
  videoExtractionPrompt: string | null;
  videoDefaultMessage: string | null;
}

export interface AgentFilterConfig {
  allowedPhones: string[];
  allowedGroups: string[];
  triggerEnabled: boolean;
  triggerWords: string[];
  triggerCaseSensitive: boolean;
  triggerRemoveFromText: boolean;
}

export type JourneyTrigger = 'FIRST_MESSAGE' | 'MENU_LINK_SENT' | 'MANUAL';
export type FollowUpDelayFrom = 'JOURNEY_START' | 'PREVIOUS_STEP';

export interface FollowUpStep {
  id: string;
  delayMinutes: number;
  delayFrom: FollowUpDelayFrom;
  message: string;
  askForHelp: boolean;
  active: boolean;
}

export interface AgentJourneyConfig {
  enabled: boolean;
  journeyTrigger: JourneyTrigger;
  followUpEnabled: boolean;
  cancelOnReply: boolean;
  followUpSteps: FollowUpStep[];
  helpKeywords: string[];
  helpAutoEscalate: boolean;
  helpAckMessage: string | null;
  purchaseWebhookEnabled: boolean;
}

export interface AgentNotificationConfig {
  helpNotificationEnabled: boolean;
  helpNotificationPhone: string | null;
  helpNotificationIgnoreReplies: boolean;
}

export interface AgentWithConfigs extends AgentData {
  persona: AgentPersona | null;
  modelConfig: AgentModelConfig | null;
  memoryConfig: AgentMemoryConfig | null;
  mediaConfig: AgentMediaConfig | null;
  filterConfig: AgentFilterConfig | null;
  journeyConfig: AgentJourneyConfig | null;
  notificationConfig: AgentNotificationConfig | null;
}

export interface CompanyWithAgentCount extends Company {
  _count?: { agents: number };
  agentCount?: number;
}

export interface KnowledgeBase {
  id: string;
  name: string;
  description: string | null;
  companyId: string;
  agentId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IngestResult {
  jobId?: string;
  message?: string;
}

// ─── MCP Servers ─────────────────────────────────────────────────────────────

export type McpTransport = 'STDIO' | 'SSE';

export interface McpServerData {
  id: string;
  agentId: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;
  command: string | null;
  args: string[];
  env: Record<string, string>;
  url: string | null;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMcpServerPayload {
  name: string;
  transport: McpTransport;
  enabled?: boolean;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  url?: string;
  headers?: Record<string, string>;
}

export type UpdateMcpServerPayload = Partial<CreateMcpServerPayload>;

// ─── Agent Trace ──────────────────────────────────────────────────────────────

export type AgentRunStatus = 'RUNNING' | 'COMPLETED' | 'FAILED';

export type AgentRunStepType =
  | 'RAG_SEARCH'
  | 'LLM_CALL'
  | 'TOOL_CALL'
  | 'MCP_TOOL_CALL'
  | 'ERROR';

export interface AgentRunSummary {
  id: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  status: AgentRunStatus;
  inputPrompt: string;
  errorMessage: string | null;
  startedAt: string;
  finishedAt: string | null;
  durationMs: number | null;
  iterations: number;
  totalToolCalls: number;
}

export interface AgentRunStep {
  id: string;
  agentRunId: string;
  stepType: AgentRunStepType;
  toolName: string | null;
  input: Record<string, unknown> | null;
  output: Record<string, unknown> | null;
  errorMessage: string | null;
  durationMs: number | null;
  iteration: number;
  createdAt: string;
}

export interface AgentRunDetail extends AgentRunSummary {
  outputText: string | null;
  steps: AgentRunStep[];
}

export interface AgentRunsResponse {
  data: AgentRunSummary[];
  total: number;
  page: number;
  limit: number;
}

// Socket.IO event payloads
export interface RunStartedPayload {
  runId: string;
  agentId: string;
  companyId: string;
  conversationId: string;
  inputPrompt: string;
  startedAt: string;
}

export interface RunStepPayload {
  runId: string;
  agentId: string;
  step: AgentRunStep;
}

export interface RunCompletedPayload {
  runId: string;
  agentId: string;
  outputText: string;
  iterations: number;
  totalToolCalls: number;
  durationMs: number;
  finishedAt: string;
}

export interface RunFailedPayload {
  runId: string;
  agentId: string;
  errorMessage: string;
  finishedAt: string;
}
