export type ScheduledDispatchStatus =
  'WAITING' | 'COMPLETED' | 'PROCESSING' | 'FAILED'

export interface ScheduledDispatchCampaignMetric {
  automaticCampaignId: string
  campaignId: null
  conversionRate: number
  createdAt: string
  id: string
  messagesDelivered: number
  messagesError: number
  messagesRead: number
  messagesSent: number
  salesTotalAmount: number
  salesTotalQuantity: number
  totalCustomers: number
  updatedAt: string
}

export interface ScheduledDispatchCampaign {
  campaignMetric: ScheduledDispatchCampaignMetric[]
  companyId: string
  createdAt: string
  id: string
  imageUrl: string
  messageText: string
  modifiedByAI: boolean
  name: string
  scheduledDate: string
  segmentation: string
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  customSendListId?: string | null
  status: ScheduledDispatchStatus
  updatedAt: string
}

export interface ScheduledDispatchCampaignResponse {
  data: ScheduledDispatchCampaign[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type AutomaticCampaignType = 'REACTIVATION' | 'RECURRENCE'

export type RecurringGiftType = 'discount' | 'tax' | 'none'

export type RecurringGiftUnit = 'percent' | 'currency' | 'km'

export type CampaignChannel =
  | 'whatsapp_web'
  | 'whatsapp_business_api'
  | 'email'
  | 'sms'
  | 'rcs'
  | 'push_notification'

export interface CampaignMessageTypeBreakdown {
  channel: CampaignChannel | string
  category: string | null
  count: number
  cost: number
}

export interface RecurringCampaignMetric {
  automaticCampaignId: string
  campaignId: null
  conversionRate: number
  createdAt: string
  id: string
  interactions: number
  messagesDelivered: number
  messagesError: number
  messagesRead: number
  messagesSent: number
  salesTotalAmount: number
  salesTotalQuantity: number
  totalCustomers: number
  totalCost: number
  messageTypeBreakdown: CampaignMessageTypeBreakdown[]
  updatedAt: string
}

export interface RecurringCampaignGift {
  type: RecurringGiftType
  unit?: RecurringGiftUnit
  value: number
}

export interface RecurringCampaignCreative {
  id: string
  /** Array de URLs de imagem retornado pela API. */
  imageUrls?: string[]
  title?: string
  /** Texto/corpo do criativo retornado pela API (equivale a `description` no formulário). */
  message?: string
  link?: string | null
}

export type RecurringCampaignStatus =
  'PROCESSING' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED'

export interface RecurringCampaign {
  active: boolean
  campaignMetric: RecurringCampaignMetric[]
  createdAt: string
  daysOfWeek: string[]
  endDate: string | null
  gifts: RecurringCampaignGift[]
  id: string
  images: string
  maxDailySends?: number
  messageText: string
  name: string
  showSalesOnCard?: boolean
  segmentation: string
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  customSendListId?: string | null
  startDate: string
  channels?: CampaignChannel[]
  creatives?: RecurringCampaignCreative[]
  /** Quando presente, benefício exclusivo de cupom (sem gift de incentivo). */
  couponId?: string | null
  type: AutomaticCampaignType
  sendTimeStart?: string | null
  sendTimeEnd?: string | null
  /** Campo singular retornado pela API no GET (equivalente a channels[0], uppercase). */
  channel?: AutomaticCampaignApiChannel
  metaMessageTemplateId?: string | null
  metaTemplateVariableMappings?: MetaTemplateVariableMapping[]
  /** Status operacional da campanha retornado pela API. */
  status?: RecurringCampaignStatus
  updatedAt: string
}

export interface RecurringCampaignResponse {
  data: RecurringCampaign[]
  meta: {
    total: number
    page: number
    limit: number
    totalPages: number
  }
}

export type RecurringCampaignMessageStatus =
  'PENDING' | 'SENT' | 'PROCESSING' | 'ERROR' | 'ABORTED'

export type RecurringCampaignMessageOrder = {
  id: string
  displayId: number
  status: string
  total: string
  orderType: string
  salesChannel: string
  createdAt: string
}

export type RecurringCampaignMessage = {
  createdAt: string
  customerId?: string
  customerName: string
  customerRfvClassification?: RfvClassificationSnake | string
  mediaUrl: string
  messageText: string
  phone: string
  scheduledDate: string
  segmentation: string
  status: RecurringCampaignMessageStatus | string
  hasClick?: boolean
  hasOrder?: boolean
  orders?: RecurringCampaignMessageOrder[]
}

// A API de mensagens retorna um array direto (sem wrapper { data, meta }).
export type RecurringCampaignMessageListResponse = RecurringCampaignMessage[]

/**
 * Filtros aceitos pela rota `GET /campaigns/automatic/:companyId/:id/messages`.
 * - `startDate`/`endDate` sempre andam juntos. Se ambos ausentes, o backend
 *   assume o dia atual em UTC.
 * - Arrays vazios não devem ser enviados (o frontend omite o param).
 */
export interface RecurringCampaignMessagesQuery {
  startDate?: string
  endDate?: string
  rfvClassification?: RfvClassificationSnake[]
  status?: RecurringCampaignMessageStatus[]
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: 'asc' | 'desc'
}

export interface SegmentAttribution {
  id: RfvClassificationSnake
  name: string
  description?: string
  conversionDays: number
}

export interface ListSegmentAttributionsResponse {
  data: SegmentAttribution[]
}

export interface UpdateSegmentAttributionPayload {
  segmentId: RfvClassificationSnake
  conversionDays: number
}

/**
 * Janela de conversão por classificação RFV (backend).
 * Backend usa chaves em camelCase.
 */
export type ConversionWindowResponse = {
  campeao: number
  fiel: number
  emPotencial: number
  novo: number
  promissor: number
  precisaDeAtencao: number
  quaseDormente: number
  naoPossoPerder: number
  emRisco: number
  hibernando: number
  perdido: number
}

export type RfvClassificationSnake =
  | 'campeao'
  | 'fiel'
  | 'em_potencial'
  | 'novo'
  | 'promissor'
  | 'precisa_de_atencao'
  | 'quase_dormente'
  | 'nao_posso_perder'
  | 'em_risco'
  | 'hibernando'
  | 'perdido'

export type UpdateConversionWindowRequestItem = {
  rfvClassification: RfvClassificationSnake
  thresholdDays: number
}

export type UpdateConversionWindowRequest = {
  items: UpdateConversionWindowRequestItem[]
}

/** Canal no contrato de criação/atualização automática (UPPER_SNAKE). */
export type AutomaticCampaignApiChannel =
  | 'WHATSAPP_WEB'
  | 'WHATSAPP_BUSINESS_API'
  | 'EMAIL'
  | 'SMS'
  | 'RCS'
  | 'PUSH_NOTIFICATION'

/** Brinde/gift no formato enviado ao back (ex.: desconto em PT). */
export type CreateAutomaticCampaignGift = {
  type: string
  unit: string
  value: number
}

/** Criativo no POST/PUT (estrutura do back). */
export type CreateAutomaticCampaignCreativeRequest = {
  id?: string
  imageUrls: string[]
  title?: string
  message: string
  link: string | null
}

export type MetaTemplateVariableMapping = {
  index: number
  source: string
}

/**
 * Corpo do POST/PUT de campanha automática.
 * - `images`: string JSON (array de URLs) conforme back.
 * - `couponId`: null quando nenhum cupom selecionado.
 */
export type AudienceTargetingMode = 'RFV' | 'AUDIENCE' | 'CUSTOMER_LIST'

/** Body de POST `/campaigns/automatic/:companyId/reach-preview`. */
export type ReachPreviewRequest = {
  targetingMode?: AudienceTargetingMode
  segmentation?: string
  audienceId?: string
  customSendListId?: string
  channel?: AutomaticCampaignApiChannel
}

export type ReachPreviewResponse = {
  count: number
}

export type CreateAutomaticCampaignRequest = {
  name: string
  type: AutomaticCampaignType
  channel: AutomaticCampaignApiChannel
  targetingMode?: AudienceTargetingMode
  audienceId?: string | null
  customSendListId?: string | null
  segmentation?: string
  maxDailySends: number
  active: boolean
  /** JSON stringificado: string[] de URLs. */
  images: string
  startDate: string
  endDate: string | null
  messageText: string
  daysOfWeek: string[]
  gifts: CreateAutomaticCampaignGift[]
  creatives?: CreateAutomaticCampaignCreativeRequest[]
  couponId: string | null
  sendTimeStart?: string | null
  sendTimeEnd?: string | null
  metaMessageTemplateId?: string | null
  metaTemplateVariableMappings?: MetaTemplateVariableMapping[]
}
