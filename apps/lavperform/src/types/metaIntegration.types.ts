export type MetaIntegrationStatus = 'ACTIVE' | 'PENDING' | null
export type MetaIntegrationQualityRating = 'GREEN' | 'YELLOW' | 'RED' | 'UNKNOWN'

export type MetaIntegrationAvailability = {
  available: boolean
  status: MetaIntegrationStatus
  hasPhoneNumberId: boolean
  hasWabaId: boolean
  phoneNumberRegistered: boolean
  displayName: string | null
  phoneNumber: string | null
}

export type MetaIntegrationConnectPayload = {
  number: string
  access_token: string
  token_type: string
  phone_number_id: string
  waba_id: string
  business_id: string
}

export type MetaIntegration = {
  id: string
  companyId: string
  phoneNumber: string | null
  phoneNumberId: number | null
  wabaId: number | null
  businessId: number | null
  displayName: string | null
  qualityRating: MetaIntegrationQualityRating | null
  messagingLimitTier: string | null
  webhooksSubscribed: boolean
  phoneNumberRegistered: boolean
  status: Exclude<MetaIntegrationStatus, null>
  createdAt: string
  updatedAt: string
}
