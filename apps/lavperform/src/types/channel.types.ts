export type WhatsAppWebStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING'

export interface WhatsAppWebInstance {
  id: string
  status: WhatsAppWebStatus
  code?: string
}

export interface WhatsAppWebConnection {
  id: string
  status: WhatsAppWebStatus
  code?: string
  phoneNumber?: string
  name?: string
}
