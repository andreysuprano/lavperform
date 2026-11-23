import axios from 'axios'

import type { CompanyIntegration, CompanyIntegrationArgs } from '@/types'

import { client } from './client'

export const integrationService = {
  async getCompanyIntegration(companyId: string) {
    return await client.get<CompanyIntegration[]>(
      `/onboarding/partner/${companyId}`
    )
  },
  async saveUpdateCompanyIntegration({
    companyId,
    payload,
  }: CompanyIntegrationArgs) {
    return await client.post(
      `/onboarding/digital-menu-integration/${companyId}`,
      payload
    )
  },
  async importHistory({
    companyId,
    partnerSlug,
    startDate,
    endDate,
  }: {
    companyId: string
    partnerSlug: 'MAXLAV' | 'LAUNDRYKIT'
    startDate: string
    endDate: string
  }) {
    const path =
      partnerSlug === 'MAXLAV'
        ? `/companies/${companyId}/maxlav/import-historical-sales`
        : `/companies/${companyId}/laundrykit/import-historical-sales`

    try {
      return await client.post(path, { startDate, endDate })
    } catch (error) {
      throw new Error(importHistoryMessage(error))
    }
  },
}

function importHistoryMessage(error: unknown): string {
  if (axios.isAxiosError(error)) {
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    if (Array.isArray(message) && message.length > 0) return message.join(' ')
  }
  return 'Não foi possível iniciar a importação do histórico.'
}
