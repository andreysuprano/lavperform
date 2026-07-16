export type MetaTemplateStatus =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'DISABLED'
  | 'PAUSED'
  | 'IN_APPEAL'
  | 'DELETED'
  | 'ERROR'

export type MetaTemplateCategory = 'AUTHENTICATION' | 'MARKETING' | 'UTILITY'

export type MetaTemplateHeaderFormat = 'TEXT' | 'IMAGE' | 'VIDEO' | 'DOCUMENT'

export type MetaTemplateButtonType = 'QUICK_REPLY' | 'URL' | 'PHONE_NUMBER'

export type MetaTemplateComponent = {
  type: string
  format?: string
  text?: string
  buttons?: Array<Record<string, unknown>>
  example?: Record<string, unknown>
}

export type MetaMessageTemplate = {
  id: string
  companyId: string
  automaticCampaignCreativeId: string | null
  metaTemplateId: string | null
  name: string
  displayName: string | null
  language: string
  category: MetaTemplateCategory
  components: MetaTemplateComponent[]
  status: MetaTemplateStatus
  rejectedReason: string | null
  qualityScore: unknown | null
  createdAt: string
  updatedAt: string
}

export type MetaTemplateSyncResult = {
  template: MetaMessageTemplate
  statusChanged: boolean
  previousStatus: MetaTemplateStatus
}

export type MetaTemplateSyncAllResult = {
  synced: number
  statusChanged: number
  approved: number
}

export type CreateMetaTemplateHeader = {
  format: MetaTemplateHeaderFormat
  text?: string
  example?: string
  mediaUrl?: string
}

export type CreateMetaTemplateBody = {
  text: string
  examples?: string[]
}

export type CreateMetaTemplateButton = {
  type: MetaTemplateButtonType
  text: string
  url?: string
  urlExample?: string
  phoneNumber?: string
}

export type CreateMetaTemplatePayload = {
  displayName: string
  category: MetaTemplateCategory
  language: string
  header?: CreateMetaTemplateHeader
  body: CreateMetaTemplateBody
  footer?: string
  buttons?: CreateMetaTemplateButton[]
}

export type MetaTemplateFormValues = {
  displayName: string
  category: MetaTemplateCategory
  language: string
  headerEnabled: boolean
  headerFormat: MetaTemplateHeaderFormat
  headerText: string
  headerExample: string
  headerImageBase64: string | null
  headerImageUrl: string | null
  bodyText: string
  bodyExamples: string[]
  footerText: string
  buttons: CreateMetaTemplateButton[]
}
