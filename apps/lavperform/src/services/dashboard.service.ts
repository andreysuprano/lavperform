import type { DashCampaignsProps, DashCustomersProps } from '@/types'

import { client } from './client'

/**
 * Parâmetros aceitos pelos endpoints de resumo de campanhas.
 * Regras do backend:
 * - Enviar `dateFilter` (7|14|30) → preset em dias.
 * - Enviar `startDate` + `endDate` juntos (ISO YYYY-MM-DD) → intervalo custom.
 * - `dateFilter` é ignorado quando `startDate`/`endDate` estão presentes.
 * - Nunca enviar só um dos dois (`startDate` OU `endDate`)   retorna 400.
 */
export type CampaignsSummaryParams =
  | { dateFilter?: number | string; startDate?: undefined; endDate?: undefined }
  | { startDate: string; endDate: string; dateFilter?: undefined }

export const dashboardService = {
  async getCustomers(companyId: string) {
    return await client.get<DashCustomersProps>(
      `/dashboard/customers-summary/${companyId}`
    )
  },

  async getCampaigns(companyId: string, params: CampaignsSummaryParams = {}) {
    return await client.get<DashCampaignsProps>(
      `/dashboard/campaigns-summary/${companyId}`,
      { params }
    )
  },
}
