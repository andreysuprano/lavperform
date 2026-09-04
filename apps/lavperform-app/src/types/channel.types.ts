export type WhatsAppWebStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING'

export interface WhatsAppWebInstance {
  id: string
  status: WhatsAppWebStatus
  code?: string
  /** Número conectado (somente dígitos); mantém o último conhecido se desconectar. */
  phoneNumber?: string | null
}

export interface WhatsAppWebConnection {
  id: string
  status: WhatsAppWebStatus
  code?: string
  phoneNumber?: string
  name?: string
}
