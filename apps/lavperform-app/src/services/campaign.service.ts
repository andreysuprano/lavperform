import type {
  CreateAutomaticCampaignRequest,
  ReachPreviewRequest,
  ReachPreviewResponse,
  RecurringCampaign,
  RecurringCampaignMessage,
  RecurringCampaignMessagesQuery,
  RecurringCampaignResponse,
  ScheduledDispatchCampaign,
  ScheduledDispatchCampaignResponse,
} from '@/types'

export type { ReachPreviewRequest, ReachPreviewResponse }

import { client } from './client'
import type { CampaignsSummaryParams } from './dashboard.service'

/**
 * Serializa os filtros de `/campaigns/automatic/.../messages` como repetidos,
 * seguindo o padrão preferido pelo backend (`rfvClassification=a&rfvClassification=b`).
 * Arrays vazios são omitidos; `startDate` sem `endDate` (ou vice-versa) também
 * é descartado para evitar 400 no backend.
 */
function buildCampaignMessagesParams(
  query: RecurringCampaignMessagesQuery | undefined
): URLSearchParams | undefined {
  if (!query) return undefined

  const params = new URLSearchParams()
  const hasStart = !!query.startDate
  const hasEnd = !!query.endDate
  if (hasStart && hasEnd) {
    params.append('startDate', query.startDate!)
    params.append('endDate', query.endDate!)
  }

  if (query.rfvClassification?.length) {
    for (const rfv of query.rfvClassification) {
      params.append('rfvClassification', rfv)
    }
  }

  if (query.status?.length) {
    for (const status of query.status) {
      params.append('status', status)
    }
  }

  if (query.page != null) params.append('page', String(query.page))
  if (query.limit != null) params.append('limit', String(query.limit))
  if (query.orderBy) params.append('orderBy', query.orderBy)
  if (query.orderDirection) {
    params.append('orderDirection', query.orderDirection)
  }

  return params.toString() ? params : undefined
}

export const scheduledDispatchCampaignService = {
  async listCampaigns(
    companyId: string,
    params?: {
      page?: number
      limit?: number
      orderDirection?: 'asc' | 'desc'
      name?: string
    }
  ) {
    return await client.get<ScheduledDispatchCampaignResponse>(
      `/companies/${companyId}/campaigns`,
      {
        params,
      }
    )
  },

  async createCampaign(
    companyId: string,
    campaign: Partial<ScheduledDispatchCampaign>
  ) {
    return await client.post(`/companies/${companyId}/campaigns`, campaign)
  },

  async updateCampaign(
    companyId: string,
    campaignId: string,
    campaign: Partial<ScheduledDispatchCampaign>
  ) {
    return await client.patch(
      `/companies/${companyId}/campaigns/${campaignId}`,
      campaign
    )
  },

  async deleteCampaign(companyId: string, campaignId: string) {
    return await client.delete(
      `/companies/${companyId}/campaigns/${campaignId}`
    )
  },
}

export const recurringCampaignService = {
  async listCampaigns(
    companyId: string,
    params?: {
      page?: number
      limit?: number
      orderDirection?: 'asc' | 'desc'
      name?: string
    }
  ) {
    return await client.get<RecurringCampaignResponse>(
      `/campaigns/automatic/${companyId}`,
      {
        params,
      }
    )
  },

  async createCampaign(
    companyId: string,
    campaign: CreateAutomaticCampaignRequest
  ) {
    return await client.post(`/campaigns/automatic/${companyId}`, campaign)
  },

  async updateCampaign(
    companyId: string,
    campaign: CreateAutomaticCampaignRequest | Partial<RecurringCampaign>,
    campaignId: string
  ) {
    return await client.put(
      `/campaigns/automatic/${companyId}/${campaignId}`,
      campaign
    )
  },

  async getCampaign(id: string, companyId: string) {
    return await client.get(`/campaigns/automatic/${companyId}/${id}`)
  },

  async getCampaignMetrics(
    id: string,
    companyId: string,
    params: CampaignsSummaryParams = {}
  ) {
    return await client.get(`/campaigns/automatic/${companyId}/${id}/metrics`, {
      params,
    })
  },

  async getCampaignMessages(
    id: string,
    companyId: string,
    query?: RecurringCampaignMessagesQuery
  ) {
    return await client.get<RecurringCampaignMessage[]>(
      `/campaigns/automatic/${companyId}/${id}/messages`,
      {
        params: buildCampaignMessagesParams(query),
      }
    )
  },

  async deleteCampaign(id: string, companyId: string) {
    return await client.delete(`/campaigns/automatic/${companyId}/${id}`)
  },

  async toggleCampaign(id: string, companyId: string) {
    return await client.put(
      `/campaigns/automatic/${companyId}/${id}/toggle-active`
    )
  },

  async duplicateCampaign(id: string, companyId: string) {
    return await client.post<RecurringCampaign>(
      `/campaigns/automatic/${companyId}/${id}/duplicate`
    )
  },

  async getReachPreview(companyId: string, request: ReachPreviewRequest) {
    return await client.post<ReachPreviewResponse>(
      `/campaigns/automatic/${companyId}/reach-preview`,
      request
    )
  },
}
