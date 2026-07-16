export interface DigitalMenuIntegration {
  merchantId?: string
  apiKey?: string
  digitalMenuUrl?: string
}

export interface CompanyIntegration {
  id: string
  name: string
  logoUrl?: string
  baseUrlWebhook?: string
  digitalMenuIntegrations: DigitalMenuIntegration[]
}

export interface CompanyIntegrationArgs {
  companyId: string
  payload: {
    partnerId: string
    apiKey: string
    apiSecret: string
    merchantId: string
    digitalMenuUrl: string
  }
}
