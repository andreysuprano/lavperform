import type { CreatePartner, Partner, UpdatePartner } from '@/types'

import { client } from './client'

export const partnerService = {
  async createPartner(partner: CreatePartner) {
    return await client.post<{ message: string; data: Partner }>(
      '/onboarding/business-partner',
      partner
    )
  },

  async listPartners(params?: {
    page?: number
    limit?: number
    orderDirection?: 'asc' | 'desc'
    name?: string
  }) {
    return await client.get<Partner[]>('/onboarding/business-partner', {
      params,
    })
  },

  // Preparado para quando o endpoint estiver disponível
  async getPartner(partnerId: string) {
    return await client.get<Partner>(`/partners/${partnerId}`)
  },

  // Preparado para quando o endpoint estiver disponível
  async updatePartner(partnerId: string, partner: UpdatePartner) {
    return await client.patch<{ message: string; data: Partner }>(
      `/partners/${partnerId}`,
      partner
    )
  },
}
