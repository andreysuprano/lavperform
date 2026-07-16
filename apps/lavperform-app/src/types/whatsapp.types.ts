export type WhatsAppStatus = 'CONNECTED' | 'DISCONNECTED' | 'PENDING'

export interface WhatsAppInstance {
  id: string
  status: WhatsAppStatus
  code?: string
}

export interface WhatsAppConnection {
  id: string
  status: WhatsAppStatus
  code?: string
  phoneNumber?: string
  name?: string
}

export interface WhatsAppContact {
  name: string
  phone: string
}

export interface WhatsAppContactsResponse {
  phoneNumber: string
  profilePic: string
  profileName: string
  numberOfContacts: number
  contacts: WhatsAppContact[]
}