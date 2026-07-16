import type {
  MetaIntegration,
  MetaIntegrationAvailability,
  MetaIntegrationConnectPayload,
} from '@/types'

import { client } from './client'

export const metaIntegrationService = {
  async getAvailability(companyId: string) {
    return await client.get<MetaIntegrationAvailability>(
      `/companies/${companyId}/meta-integration/availability`
    )
  },

  async getIntegration(companyId: string) {
    return await client.get<MetaIntegration>(
      `/companies/${companyId}/meta-integration`
    )
  },

  async connect(companyId: string, payload: MetaIntegrationConnectPayload) {
    return await client.post<MetaIntegration>(
      `/companies/${companyId}/meta-integration/connect`,
      payload
    )
  },

  async disconnect(companyId: string) {
    return await client.delete(
      `/companies/${companyId}/meta-integration/disconnect`
    )
  },
}
