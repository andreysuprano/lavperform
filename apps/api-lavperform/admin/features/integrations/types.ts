export type ImportHistoryRoute = "unified" | "dedicated" | "none"

export interface IntegrationPartner {
  id: string
  name: string
  partnerSlug: string | null
  logoUrl: string | null
  baseUrlWebhook: string | null
  createdAt: string
  requiredFields: string[]
  optionalFields: string[]
  supportsImportHistory: boolean
  importHistoryRoute: ImportHistoryRoute
}

export interface IntegrationPartnerSummary {
  id: string
  name: string
  partnerSlug: string | null
  logoUrl: string | null
  baseUrlWebhook: string | null
}

export interface CompanyIntegration {
  id: string
  companyId: string
  partnerId: string | null
  apiKey: string | null
  apiSecret: string | null
  username: string | null
  password: string | null
  merchantId: string | null
  digitalMenuUrl: string | null
  active: boolean
  hasApiKey: boolean
  hasApiSecret: boolean
  hasUsername: boolean
  hasPassword: boolean
  createdAt: string
  updatedAt: string
  partner: IntegrationPartnerSummary | null
}

export interface ImportHistoryResult {
  message: string
  startDate: string
  endDate: string
  totalDays: number
  jobsCreated: number
}

export type IntegrationFieldName =
  | "apiKey"
  | "apiSecret"
  | "username"
  | "password"
  | "merchantId"
  | "digitalMenuUrl"
