export interface DigitalMenuIntegration {
  merchantId?: string
  apiKey?: string
  apiSecret?: string
  password?: string
  digitalMenuUrl?: string
}

export interface CompanyIntegration {
  id: string
  name: string
  logoUrl?: string
  baseUrlWebhook?: string
  requiredFields?: string[]
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
