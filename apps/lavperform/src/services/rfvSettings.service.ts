import type { RFVConfiguration } from '@/types'

import { client } from './client'

export const rfvSettingsService = {
  async getSettings(companyId: string) {
    return await client.get<RFVConfiguration>(`/rfv-engine/configuration/${companyId}`)
  },

  async updateSettings(companyId: string, settings: Partial<RFVConfiguration>) {
    return await client.put<RFVConfiguration>(`/rfv-engine/configuration/${companyId}`, settings)
  },
}

