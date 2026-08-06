export const AGENT_REPOSITORY = Symbol('AGENT_REPOSITORY');

// ─── Enums (espelham o schema Prisma, definidos aqui para desacoplar) ─────────

export enum AgentVoiceTone {
  FORMAL = 'FORMAL',
  INFORMAL = 'INFORMAL',
  FRIENDLY = 'FRIENDLY',
  PROFESSIONAL = 'PROFESSIONAL',
  EMPATHETIC = 'EMPATHETIC',
  ASSERTIVE = 'ASSERTIVE',
}

export enum AgentCommunicationStyle {
  CONCISE = 'CONCISE',
  DETAILED = 'DETAILED',
  TECHNICAL = 'TECHNICAL',
  SIMPLIFIED = 'SIMPLIFIED',
  BALANCED = 'BALANCED',
}

export enum AgentLanguage {
  PT_BR = 'PT_BR',
  EN_US = 'EN_US',
  ES_ES = 'ES_ES',
}

export enum LlmProvider {
  OPENAI = 'OPENAI',
  ANTHROPIC = 'ANTHROPIC',
  GOOGLE = 'GOOGLE',
  GROQ = 'GROQ',
}

export enum AgentMemoryType {
  BUFFER = 'BUFFER',
  SUMMARY = 'SUMMARY',
  VECTOR = 'VECTOR',
  NONE = 'NONE',
}

export enum JourneyTrigger {
  FIRST_MESSAGE = 'FIRST_MESSAGE',
  MENU_LINK_SENT = 'MENU_LINK_SENT',
  MANUAL = 'MANUAL',
}

export enum CustomerJourneyStatus {
  ACTIVE = 'ACTIVE',
  PURCHASED = 'PURCHASED',
  HELP_REQUESTED = 'HELP_REQUESTED',
  ESCALATED = 'ESCALATED',
  CLOSED = 'CLOSED',
}

export enum HelpRequestStatus {
  PENDING = 'PENDING',
  CLAIMED = 'CLAIMED',
  RESOLVED = 'RESOLVED',
  DISMISSED = 'DISMISSED',
}

export type FollowUpDelayFrom = 'JOURNEY_START' | 'PREVIOUS_STEP';

export interface FollowUpStepData {
  id: string;
  delayMinutes: number;
  delayFrom: FollowUpDelayFrom;
  message: string;
  askForHelp: boolean;
  active: boolean;
}

// ─── Data shapes ──────────────────────────────────────────────────────────────

export interface AgentPersonaData {
  id: string;
  agentId: string;
  personaName: string;
  personaDescription: string | null;
  systemPrompt: string;
  behaviorGuidelines: string | null;
  guardrails: string | null;
  contextPrompt: string | null;
  welcomeMessage: string | null;
  messageSignature: string | null;
  voiceTone: AgentVoiceTone;
  communicationStyle: AgentCommunicationStyle;
  language: AgentLanguage;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentModelConfigData {
  id: string;
  agentId: string;
  provider: LlmProvider;
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streaming: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMemoryConfigData {
  id: string;
  agentId: string;
  memoryType: AgentMemoryType;
  windowSize: number;
  maxSummaryTokens: number;
  useLongTermMemory: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentMediaConfigData {
  id: string;
  agentId: string;
  audioEnabled: boolean;
  audioDefaultMessage: string | null;
  imageEnabled: boolean;
  imageExtractionPrompt: string | null;
  imageDefaultMessage: string | null;
  videoEnabled: boolean;
  videoExtractionPrompt: string | null;
  videoDefaultMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentFilterConfigData {
  id: string;
  agentId: string;
  allowedPhones: string[];
  allowedGroups: string[];
  triggerEnabled: boolean;
  triggerWords: string[];
  triggerCaseSensitive: boolean;
  triggerRemoveFromText: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentJourneyConfigData {
  id: string;
  agentId: string;
  enabled: boolean;
  journeyTrigger: JourneyTrigger;
  followUpEnabled: boolean;
  cancelOnReply: boolean;
  followUpSteps: FollowUpStepData[];
  helpKeywords: string[];
  helpAutoEscalate: boolean;
  helpAckMessage: string | null;
  purchaseWebhookEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentNotificationConfigData {
  id: string;
  agentId: string;
  helpNotificationEnabled: boolean;
  helpNotificationPhone: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentData {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  /** Nome da instância WhatsApp vinculada a este agente (UAZAPI instanceName). */
  instanceName: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AgentWithConfigsData extends AgentData {
  persona: AgentPersonaData | null;
  modelConfig: AgentModelConfigData | null;
  memoryConfig: AgentMemoryConfigData | null;
  mediaConfig: AgentMediaConfigData | null;
  filterConfig: AgentFilterConfigData | null;
  journeyConfig: AgentJourneyConfigData | null;
  notificationConfig: AgentNotificationConfigData | null;
}

// ─── Input types ──────────────────────────────────────────────────────────────

export interface CreateAgentPersonaInput {
  personaName?: string;
  personaDescription?: string;
  systemPrompt?: string;
  behaviorGuidelines?: string;
  guardrails?: string;
  contextPrompt?: string;
  welcomeMessage?: string;
  messageSignature?: string;
  voiceTone?: AgentVoiceTone;
  communicationStyle?: AgentCommunicationStyle;
  language?: AgentLanguage;
}

export interface CreateAgentModelConfigInput {
  provider?: LlmProvider;
  modelName?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  streaming?: boolean;
}

export interface CreateAgentMemoryConfigInput {
  memoryType?: AgentMemoryType;
  windowSize?: number;
  maxSummaryTokens?: number;
  useLongTermMemory?: boolean;
}

export interface UpdateAgentMediaConfigInput {
  audioEnabled?: boolean;
  audioDefaultMessage?: string | null;
  imageEnabled?: boolean;
  imageExtractionPrompt?: string | null;
  imageDefaultMessage?: string | null;
  videoEnabled?: boolean;
  videoExtractionPrompt?: string | null;
  videoDefaultMessage?: string | null;
}

export interface UpdateAgentFilterConfigInput {
  allowedPhones?: string[];
  allowedGroups?: string[];
  triggerEnabled?: boolean;
  triggerWords?: string[];
  triggerCaseSensitive?: boolean;
  triggerRemoveFromText?: boolean;
}

export interface UpdateAgentJourneyConfigInput {
  enabled?: boolean;
  journeyTrigger?: JourneyTrigger;
  followUpEnabled?: boolean;
  cancelOnReply?: boolean;
  followUpSteps?: FollowUpStepData[];
  helpKeywords?: string[];
  helpAutoEscalate?: boolean;
  helpAckMessage?: string | null;
  purchaseWebhookEnabled?: boolean;
}

export interface UpdateAgentNotificationConfigInput {
  helpNotificationEnabled?: boolean;
  helpNotificationPhone?: string | null;
}

export interface CreateAgentInput {
  companyId: string;
  name: string;
  description?: string;
  /** Nome da instância WhatsApp (UAZAPI) a ser vinculada ao agente. */
  instanceName?: string;
  persona?: CreateAgentPersonaInput;
  modelConfig?: CreateAgentModelConfigInput;
  memoryConfig?: CreateAgentMemoryConfigInput;
}

export interface UpdateAgentInput {
  name?: string;
  description?: string | null;
  active?: boolean;
  /** Atualiza o vínculo com a instância WhatsApp (null para desvincular). */
  instanceName?: string | null;
}

export type UpdateAgentPersonaInput = Partial<CreateAgentPersonaInput>;
export type UpdateAgentModelConfigInput = Partial<CreateAgentModelConfigInput>;
export type UpdateAgentMemoryConfigInput = Partial<CreateAgentMemoryConfigInput>;

// ─── Repository interface ─────────────────────────────────────────────────────

export interface AgentRepositoryPort {
  create(input: CreateAgentInput): Promise<AgentWithConfigsData>;
  findById(id: string): Promise<AgentWithConfigsData | null>;
  findAllByCompany(companyId: string): Promise<AgentData[]>;
  findFirstActiveByCompany(companyId: string): Promise<AgentWithConfigsData | null>;
  /**
   * Busca o agente ativo vinculado a uma instância WhatsApp específica.
   * Inclui verificação de companyId para garantir isolamento multi-tenant.
   */
  findActiveByInstanceName(
    instanceName: string,
    companyId: string,
  ): Promise<AgentWithConfigsData | null>;
  update(id: string, input: UpdateAgentInput): Promise<AgentData>;
  updatePersona(agentId: string, input: UpdateAgentPersonaInput): Promise<AgentPersonaData>;
  updateModelConfig(agentId: string, input: UpdateAgentModelConfigInput): Promise<AgentModelConfigData>;
  updateMemoryConfig(agentId: string, input: UpdateAgentMemoryConfigInput): Promise<AgentMemoryConfigData>;
  updateMediaConfig(agentId: string, input: UpdateAgentMediaConfigInput): Promise<AgentMediaConfigData>;
  updateFilterConfig(agentId: string, input: UpdateAgentFilterConfigInput): Promise<AgentFilterConfigData>;
  updateJourneyConfig(agentId: string, input: UpdateAgentJourneyConfigInput): Promise<AgentJourneyConfigData>;
  updateNotificationConfig(
    agentId: string,
    input: UpdateAgentNotificationConfigInput,
  ): Promise<AgentNotificationConfigData>;
  delete(id: string): Promise<void>;
}
