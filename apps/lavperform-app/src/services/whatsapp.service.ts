import type {
  WhatsAppConnection,
  WhatsAppContactsResponse,
  WhatsAppInstance,
} from '@/types'

import { client } from './client'

export const whatsappService = {
  async checkInstanceStatus(companyId: string) {
    return await client.get<WhatsAppInstance>(
      `/whatsapp/companies/${companyId}/instances/status`
    )
  },

  async createInstance(companyId: string) {
    return await client.post<WhatsAppInstance>(
      `/whatsapp/companies/${companyId}/instances`,
      {}
    )
  },

  async getInstanceConnection(companyId: string) {
    return await client.get<WhatsAppConnection>(
      `/whatsapp/companies/${companyId}/instances/connection`
    )
  },

  async deleteInstance(companyId: string) {
    return await client.delete(`/whatsapp/companies/${companyId}/instances`)
  },

  async getContacts(companyId: string) {
    return await client.get<WhatsAppContactsResponse>(
      `/whatsapp/companies/${companyId}/contacts`
    )
  },
}
