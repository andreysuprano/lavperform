import type { WhatsAppWebConnection, WhatsAppWebInstance } from '@/types'

import { client } from './client'

export const channelService = {
  whatsappWeb: {
    async getStatus(companyId: string) {
      return await client.get<WhatsAppWebInstance>(
        `/whatsapp/companies/${companyId}/instances/status`
      )
    },

    async getConnection(companyId: string) {
      return await client.get<WhatsAppWebConnection>(
        `/whatsapp/companies/${companyId}/instances/connection`
      )
    },

    async connect(companyId: string) {
      return await client.post<WhatsAppWebInstance>(
        `/whatsapp/companies/${companyId}/instances`,
        {}
      )
    },

    async disconnect(companyId: string) {
      return await client.delete(
        `/whatsapp/companies/${companyId}/instances`
      )
    },
  },
}
