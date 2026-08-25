export type CampaignStatus = "WAITING" | "PROCESSING" | "COMPLETED" | "FAILED"

export type AutomaticCampaignStatus =
  | "PROCESSING"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "FAILED"

export type AutomaticCampaignType =
  | "ACQUISITION"
  | "RECURRENCE"
  | "REACTIVATION"
  | "RECOGNITION"
  | "SALES"

export type CampaignChannel =
  | "WHATSAPP_WEB"
  | "WHATSAPP_BUSINESS_API"
  | "SMS"
  | "RCS"
  | "EMAIL"
  | "PUSH_NOTIFICATION"

export type MessageStatus =
  | "PENDING"
  | "PROCESSING"
  | "SENT"
  | "ERROR"
  | "ABORTED"

export const CAMPAIGN_STATUS_VALUES: CampaignStatus[] = [
  "WAITING",
  "PROCESSING",
  "COMPLETED",
  "FAILED",
]

export const AUTOMATIC_CAMPAIGN_STATUS_VALUES: AutomaticCampaignStatus[] = [
  "PROCESSING",
  "IN_PROGRESS",
  "COMPLETED",
  "FAILED",
]

export const AUTOMATIC_CAMPAIGN_TYPE_VALUES: AutomaticCampaignType[] = [
  "ACQUISITION",
  "RECURRENCE",
  "REACTIVATION",
  "RECOGNITION",
  "SALES",
]

export const CREATABLE_AUTOMATIC_CAMPAIGN_TYPE_VALUES: AutomaticCampaignType[] =
  ["RECOGNITION", "SALES"]

export const CAMPAIGN_CHANNEL_VALUES: CampaignChannel[] = [
  "WHATSAPP_WEB",
  "WHATSAPP_BUSINESS_API",
  "SMS",
  "RCS",
  "EMAIL",
  "PUSH_NOTIFICATION",
]

export const MESSAGE_STATUS_VALUES: MessageStatus[] = [
  "PENDING",
  "PROCESSING",
  "SENT",
  "ERROR",
  "ABORTED",
]

export interface CompanySummary {
  id: string
  name: string
}

export interface CampaignMetric {
  id: string
  messagesSent: number
  messagesDelivered: number
  interactions: number
  messagesError: number
  conversionRate: string
  salesTotalAmount: string
  salesTotalQuantity: number
  totalCustomers: number
}

export interface MetaTemplate {
  id: string
  name: string
  status: string
  rejectedReason: string | null
  metaTemplateId: string
}

export interface Creative {
  id?: string
  title: string
  message: string
  imageUrls: string[]
  link?: string | null
  metaTemplate?: MetaTemplate | null
}

export interface Gift {
  id?: string
  type: string
  unit: string
  value: string | number
}

export interface CouponSummary {
  id: string
  code: string
  description: string
  active: boolean
  validUntil: string
}

export interface Campaign {
  id: string
  name: string
  scheduledDate: string
  messageText: string
  segmentation: string
  maxDailySends: number
  imageUrl: string | null
  status: CampaignStatus
  modifiedByAI: boolean
  channel: CampaignChannel
  companyId: string
  trakingCode: string | null
  createdAt: string
  updatedAt: string
  company?: CompanySummary
  campaignMetric?: CampaignMetric[]
  messages?: ErrorMessageSample[]
}

export interface AutomaticCampaign {
  id: string
  name: string
  type: AutomaticCampaignType
  channel: CampaignChannel
  status: AutomaticCampaignStatus
  companyId: string
  segmentation: string
  maxDailySends: number
  active: boolean
  images: string | null
  daysOfWeek: string[]
  startDate: string
  endDate: string | null
  messageText: string
  couponId: string | null
  deletedAt: string | null
  lastProcessedAt: string | null
  sendTimeStart: string | null
  sendTimeEnd: string | null
  createdAt: string
  updatedAt: string
  company?: CompanySummary
  campaignMetric?: CampaignMetric[]
  creatives?: Creative[]
  gifts?: Gift[]
  coupon?: CouponSummary | null
  errorSample?: ErrorMessageSample[]
}

export interface ErrorMessageSample {
  id: string
  phone: string
  customerName: string | null
  error: string | null
  attempts: number
  channel: CampaignChannel
  status: MessageStatus
  updatedAt: string
}

export interface CampaignMessageOrder {
  id: string
  displayId: number
  total: string
  salesChannel: string
  customerOrigin: string | null
}

export interface CampaignMessage {
  id: string
  phone: string
  customerName: string | null
  status: MessageStatus
  channel: CampaignChannel
  error: string | null
  attempts: number
  messageText: string
  mediaUrl: string | null
  scheduledDate: string | null
  createdAt: string
  updatedAt: string
  hasOrder?: boolean
  orders?: CampaignMessageOrder[]
  salesTotalAmount?: string
  salesOrigin?: string | null
}

export interface PaginationMeta {
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginatedDataResponse<T> {
  data: T[]
  meta: PaginationMeta
}

export interface ReprocessResponse {
  message: string
  campaignId: string
}

export interface CampaignListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  companyId?: string
  name?: string
  status?: CampaignStatus
  channel?: CampaignChannel
  modifiedByAI?: boolean
  startDate?: string
  endDate?: string
  trakingCode?: string
}

export interface AutomaticCampaignListParams {
  page?: number
  limit?: number
  orderBy?: string
  orderDirection?: "asc" | "desc"
  companyId?: string
  name?: string
  type?: AutomaticCampaignType
  status?: AutomaticCampaignStatus
  channel?: CampaignChannel
  active?: boolean
  startDate?: string
  endDate?: string
  deleted?: boolean
}

export interface MessageListParams {
  page?: number
  limit?: number
  orderDirection?: "asc" | "desc"
  status?: MessageStatus[]
  channel?: CampaignChannel
  phone?: string
  customerName?: string
  startDate?: string
  endDate?: string
  error?: string
  hasSale?: boolean
}

export type CampaignTab = "scheduled" | "automatic"
