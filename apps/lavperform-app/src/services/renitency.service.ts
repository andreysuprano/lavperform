import type {
  RenitencyConfiguration,
  UpdateRenitencyConfigurationPayload,
} from '@/types'

import { client } from './client'

export const renitencyService = {
  async getConfiguration(companyId: string) {
    return await client.get<RenitencyConfiguration>(
      `/renitency/configuration/${companyId}`
    )
  },

  async updateConfiguration(
    companyId: string,
    payload: UpdateRenitencyConfigurationPayload
  ) {
    return await client.put<RenitencyConfiguration>(
      `/renitency/configuration/${companyId}`,
      payload
    )
  },
}
