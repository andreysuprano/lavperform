export interface IntegrationSessionView {
  status: 'ACTIVE' | 'NEEDS_REAUTH'
  expiresAt: string
  lastError: string | null
}

export interface DigitalMenuIntegration {
  merchantId?: string
  apiKey?: string
  apiSecret?: string
  password?: string
  digitalMenuUrl?: string
  session?: IntegrationSessionView | null
}

export interface CompanyIntegration {
  id: string
  name: string
  logoUrl?: string
  baseUrlWebhook?: string
  partnerSlug?: string
  requiredFields?: string[]
  optionalFields?: string[]
  digitalMenuIntegrations: DigitalMenuIntegration[]
}

export interface CompanyIntegrationArgs {
  companyId: string
  payload: {
    partnerId: string
    apiKey: string
    apiSecret?: string
    password?: string
    merchantId: string
    digitalMenuUrl: string
  }
}
