export const UAZAPI_STATUS_VALUES = [
  "connected",
  "connecting",
  "disconnected",
  "pending",
] as const

export type UazapiInstanceStatus = (typeof UAZAPI_STATUS_VALUES)[number]

export const DB_INSTANCE_STATUS_VALUES = [
  "CONNECTED",
  "DISCONNECTED",
  "PENDING",
  "ERROR",
] as const

export type WhatsappInstanceDbStatus = (typeof DB_INSTANCE_STATUS_VALUES)[number]

export type WhatsappCompanySummary = {
  id: string
  name: string
  email: string
  cnpj?: string
  state: string
}

export type WhatsappInstanceListItem = {
  id: string
  token: string
  name: string
  status: UazapiInstanceStatus
  lastDisconnect: string | null
  updated: string
  created: string
  adminField01: string | null
  adminField02: string | null
  systemName: string | null
  company: WhatsappCompanySummary | null
}

export type UazapiInstanceDetails = {
  id: string
  token: string
  name: string
  status: UazapiInstanceStatus
  lastDisconnect: string | null
  updated: string
  created: string
  adminField01: string | null
  adminField02: string | null
  systemName: string | null
}

export type WhatsappDbInstance = {
  id: string
  name: string
  status: WhatsappInstanceDbStatus
  token: string
  phoneNumber: string | null
  companyId: string
  createdAt: string
  updatedAt: string
  uazapi: UazapiInstanceDetails | null
}

export type CompanyWhatsappResponse = {
  company: {
    id: string
    name: string
    email: string
    state: string
  }
  instance: WhatsappDbInstance | null
}

export type CreateWhatsappInstanceResponse = {
  response: string
  instance: Record<string, unknown>
  connected: boolean
  loggedIn: boolean
  name: string
  token: string
  info: string
}

export type GlobalWebhookConfig = {
  enabled?: boolean
  url?: string
  events?: string[]
  [key: string]: unknown
}

export type WebhookErrorEntry = {
  timestamp?: string
  url?: string
  statusCode?: number
  error?: string
  [key: string]: unknown
}

export type RotateTokenResponse = {
  token: string
}

export type RestartApplicationResponse = {
  message: string
}

export type InstanceListFilters = {
  search?: string
  status?: UazapiInstanceStatus
  linked?: "linked" | "orphan"
}

export type WhatsappConnectionLink = {
  id: string
  token: string
  companyId: string
  whatsappInstanceId: string
  expiresAt: string
  revokedAt: string | null
  createdAt: string
  updatedAt: string
  url: string
  isActive?: boolean
  whatsappInstance?: {
    id: string
    name: string
    status: WhatsappInstanceDbStatus
  }
}

export type CreateConnectionLinkInput = {
  companyId: string
  instanceToken?: string
}

export type PublicConnectSession = {
  companyName: string
  instanceName: string
  expiresAt: string
  status: WhatsappInstanceDbStatus
  phoneNumber: string | null
}

export type PublicConnectConnection = {
  companyName: string
  qrcode?: string
  pairingCode?: string
  code?: string
  status: string
  message?: string
}

export type PublicConnectStatus = {
  companyName: string
  status: string
  message?: string
  phoneNumber: string | null
}
