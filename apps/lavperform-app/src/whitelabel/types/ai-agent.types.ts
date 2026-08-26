// ─── Legacy types (mantidos para compatibilidade) ───────────────────────────
export type PersonalityType = 'professional' | 'friendly' | 'casual'
export type ResponseStyleType = 'concise' | 'detailed' | 'balanced'
export type LanguageType = 'pt-BR' | 'en-US'

export type PersonalityTypeBackend = 'PROFESSIONAL' | 'FRIENDLY' | 'RELAXED'
export type ResponseStyleTypeBackend = 'CONCISE' | 'DETAILED' | 'BALANCED'

export interface AIAgentSettings {
  personality: PersonalityType
  responseStyle: ResponseStyleType
  language: LanguageType
}

export interface AIAgentPrompts {
  greeting?: string
  defaultResponse?: string
  errorResponse?: string
}

export interface AIAgentIntegrations {
  whatsapp: boolean
  email: boolean
  chat: boolean
}

export interface AIAgentConfig {
  id: string
  companyId: string
  enabled: boolean
  settings: AIAgentSettings
  prompts: AIAgentPrompts
  integrations: AIAgentIntegrations
  createdAt?: string
  updatedAt?: string
}

export interface AIAgentConfigFormData {
  enabled: boolean
  settings: AIAgentSettings
  prompts: AIAgentPrompts
  integrations: AIAgentIntegrations
}

// ─── New types ───────────────────────────────────────────────────────────────

export type VoiceToneType =
  | 'FORMAL'
  | 'FRIENDLY'
  | 'NEUTRAL'
  | 'EMPATHETIC'
  | 'TECHNICAL'

export type CommunicationStyleType =
  | 'CONCISE'
  | 'DETAILED'
  | 'BALANCED'
  | 'INSTRUCTIVE'

export interface AIAgentPersona {
  personaName?: string
  systemPrompt?: string
  voiceTone?: VoiceToneType
  communicationStyle?: CommunicationStyleType
  language?: 'PT_BR'
  behaviorGuidelines?: string
  guardrails?: string
}

export interface AIAgentModelConfig {
  modelName?: string
  temperature?: number
  maxTokens?: number
}

export interface AIAgentMemoryConfig {
  memoryType?: 'BUFFER' | 'SUMMARY'
  windowSize?: number
}

export interface AIAgentMediaConfig {
  audioEnabled?: boolean
  audioDefaultMessage?: string
  imageEnabled?: boolean
  imageExtractionPrompt?: string
  imageDefaultMessage?: string
  videoEnabled?: boolean
  videoExtractionPrompt?: string
  videoDefaultMessage?: string
}

export interface AIAgentNotificationConfig {
  helpNotificationEnabled?: boolean
  helpNotificationPhone?: string
  helpNotificationIgnoreReplies?: boolean
}

// ─── Filtros ─────────────────────────────────────────────────────────────────

export interface AIAgentFilterConfig {
  allowedPhones?: string[]
  allowedGroups?: string[]
  triggerEnabled?: boolean
  triggerWords?: string[]
  triggerCaseSensitive?: boolean
  triggerRemoveFromText?: boolean
}

// ─── Jornada ─────────────────────────────────────────────────────────────────

export type JourneyTrigger = 'FIRST_MESSAGE' | 'MENU_LINK_SENT' | 'MANUAL'

export type FollowUpStepDelayFrom = 'JOURNEY_START' | 'PREVIOUS_STEP'

export interface FollowUpStep {
  id: string
  delayMinutes: number
  delayFrom: FollowUpStepDelayFrom
  message: string
  askForHelp: boolean
  active: boolean
}

export interface AIAgentJourneyConfig {
  enabled?: boolean
  journeyTrigger?: JourneyTrigger
  followUpEnabled?: boolean
  cancelOnReply?: boolean
  followUpSteps?: FollowUpStep[]
  helpKeywords?: string[]
  helpAutoEscalate?: boolean
  helpAckMessage?: string | null
  purchaseWebhookEnabled?: boolean
}

// ─── MCP ─────────────────────────────────────────────────────────────────────

export type McpTransport = 'STDIO' | 'SSE'

export interface AIAgentMcpServer {
  id: string
  name: string
  transport: McpTransport
  enabled: boolean
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
  createdAt: string
  updatedAt?: string
}

// ─── Conversas ───────────────────────────────────────────────────────────────

export type ConversationMessageRole = 'USER' | 'ASSISTANT'

export interface AIAgentConversationSummary {
  id: string
  userName: string
  userPhone: string
  isGroup: boolean
  groupName: string | null
  lastMessage: {
    content: string
    role: ConversationMessageRole
    createdAt: string
  } | null
  updatedAt: string
}

export interface AIAgentConversationsResponse {
  data: AIAgentConversationSummary[]
  total: number
  page: number
  limit: number
}

export interface AIAgentConversationMessage {
  id: string
  role: ConversationMessageRole
  content: string
  originalType: string | null
  createdAt: string
}

// ─── AIAgent entity ──────────────────────────────────────────────────────────

export interface AIAgent {
  id: string
  name: string
  description?: string
  instanceName?: string
  active: boolean
  companyId: string
  persona?: AIAgentPersona
  modelConfig?: AIAgentModelConfig
  memoryConfig?: AIAgentMemoryConfig
  mediaConfig?: AIAgentMediaConfig
  notificationConfig?: AIAgentNotificationConfig
  filterConfig?: AIAgentFilterConfig
  journeyConfig?: AIAgentJourneyConfig
  mcpServers?: AIAgentMcpServer[]
  createdAt?: string
  updatedAt?: string
}

export interface AIAgentResponse {
  data: AIAgent[]
  meta?: {
    page?: number
    limit?: number
    total?: number
  }
}

// ─── Payloads ────────────────────────────────────────────────────────────────

export interface CreateAIAgentPayload {
  name: string
  description?: string
  instanceName?: string
  persona?: AIAgentPersona
  modelConfig?: AIAgentModelConfig
  memoryConfig?: AIAgentMemoryConfig
}

export interface UpdateAIAgentPayload {
  name?: string
  description?: string
  instanceName?: string
  active?: boolean
  persona?: Partial<AIAgentPersona>
  modelConfig?: Partial<AIAgentModelConfig>
  memoryConfig?: Partial<AIAgentMemoryConfig>
}

export type UpdateAIAgentPersonaPayload = Partial<AIAgentPersona>

export type UpdateAIAgentMediaConfigPayload = Partial<AIAgentMediaConfig>

export type UpdateAIAgentNotificationConfigPayload =
  Partial<AIAgentNotificationConfig>

export type UpdateAIAgentFilterConfigPayload = Partial<AIAgentFilterConfig>

export type UpdateAIAgentJourneyConfigPayload = Partial<AIAgentJourneyConfig>

export interface CreateAIAgentMcpServerPayload {
  name: string
  transport: McpTransport
  enabled?: boolean
  command?: string
  args?: string[]
  env?: Record<string, string>
  url?: string
  headers?: Record<string, string>
}

export type UpdateAIAgentMcpServerPayload = Partial<CreateAIAgentMcpServerPayload>

// ─── Knowledge base ──────────────────────────────────────────────────────────

export function mapPersonalityToBackend(
  personality: PersonalityType
): PersonalityTypeBackend {
  if (personality === 'casual') {
    return 'RELAXED'
  }
  return personality.toUpperCase() as PersonalityTypeBackend
}

export function mapPersonalityFromBackend(
  personality: PersonalityTypeBackend
): PersonalityType {
  if (personality === 'RELAXED') {
    return 'casual'
  }
  return personality.toLowerCase() as PersonalityType
}

export function mapResponseStyleToBackend(
  style: ResponseStyleType
): ResponseStyleTypeBackend {
  return style.toUpperCase() as ResponseStyleTypeBackend
}

export function mapResponseStyleFromBackend(
  style: ResponseStyleTypeBackend
): ResponseStyleType {
  return style.toLowerCase() as ResponseStyleType
}

export type AIAgentKnowledgeFileType = 'pdf' | 'csv' | 'markdown'

export type AIAgentKnowledgeFileStatus =
  | 'processing'
  | 'ready'
  | 'error'
  | 'pending'

export type AIAgentKnowledgeFileStatusBackend =
  | 'PENDING'
  | 'PROCESSING'
  | 'READY'
  | 'ERROR'

export interface AIAgentKnowledgeFile {
  id: string
  name: string
  fileUrl: string
  type: AIAgentKnowledgeFileType
  status: AIAgentKnowledgeFileStatus
  createdAt: string
  updatedAt?: string
}

export interface AIAgentKnowledgeFileResponse {
  id: string
  agentId: string
  fileName: string
  fileUrl: string
  active: boolean
  status: AIAgentKnowledgeFileStatusBackend
  createdAt: string
  updatedAt?: string
  deletedAt?: string | null
}

export interface CreateKnowledgeFilePayload {
  fileName: string
  fileUrl: string
  active: boolean
}

export interface UpdateKnowledgeFilePayload {
  fileName?: string
  fileUrl?: string
  active?: boolean
}
