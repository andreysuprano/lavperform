import { apiClient } from "@/services/api-client"

import type {
  CreateAutomaticCampaignInput,
  CreateCampaignInput,
  UpdateAutomaticCampaignInput,
  UpdateCampaignInput,
} from "./schemas"
import type {
  AutomaticCampaign,
  AutomaticCampaignListParams,
  AutomaticCampaignStatus,
  Campaign,
  CampaignListParams,
  CampaignMessage,
  CampaignStatus,
  MessageListParams,
  PaginatedDataResponse,
  ReprocessResponse,
} from "./types"

function buildQueryString(
  params: Record<string, unknown>,
  options?: { arrayKeys?: string[] }
): string {
  const search = new URLSearchParams()
  const arrayKeys = new Set(options?.arrayKeys ?? [])

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return

    if (arrayKeys.has(key) && Array.isArray(value)) {
      value.forEach((item) => {
        if (item !== undefined && item !== null && item !== "") {
          search.append(key, String(item))
        }
      })
      return
    }

    search.set(key, String(value))
  })

  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

function cleanup<T extends Record<string, unknown>>(input: T): T {
  const output = { ...input }
  Object.keys(output).forEach((key) => {
    const value = output[key]
    if (typeof value === "string" && value.trim() === "") {
      delete output[key]
    }
  })
  return output
}

function prepareAutomaticPayload(
  input: CreateAutomaticCampaignInput | UpdateAutomaticCampaignInput
) {
  const body = cleanup({ ...input } as Record<string, unknown>)

  if (body.couponId === "") {
    body.couponId = null
  }

  if (Array.isArray(body.gifts) && body.gifts.length === 0) {
    delete body.gifts
  }

  if (Array.isArray(body.creatives) && body.creatives.length === 0) {
    delete body.creatives
  }

  if (Array.isArray(body.daysOfWeek) && body.daysOfWeek.length === 0) {
    delete body.daysOfWeek
  }

  delete body.sendScheduleMode

  return body
}

// --- Scheduled campaigns ---

export function listCampaigns(
  params: CampaignListParams = {}
): Promise<PaginatedDataResponse<Campaign>> {
  return apiClient<PaginatedDataResponse<Campaign>>(
    `/admin/campaigns${buildQueryString(params as Record<string, unknown>)}`
  )
}

export function getCampaign(id: string): Promise<Campaign> {
  return apiClient<Campaign>(`/admin/campaigns/${id}`)
}

export function createCampaign(input: CreateCampaignInput): Promise<Campaign> {
  return apiClient<Campaign>("/admin/campaigns", {
    method: "POST",
    body: JSON.stringify(cleanup({ ...input })),
  })
}

export function updateCampaign(
  id: string,
  input: UpdateCampaignInput
): Promise<Campaign> {
  return apiClient<Campaign>(`/admin/campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(cleanup({ ...input })),
  })
}

export function updateCampaignStatus(
  id: string,
  status: CampaignStatus
): Promise<Campaign> {
  return apiClient<Campaign>(`/admin/campaigns/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status }),
  })
}

export function reprocessCampaign(id: string): Promise<ReprocessResponse> {
  return apiClient<ReprocessResponse>(`/admin/campaigns/${id}/reprocess`, {
    method: "POST",
  })
}

export function deleteCampaign(id: string): Promise<Campaign> {
  return apiClient<Campaign>(`/admin/campaigns/${id}`, { method: "DELETE" })
}

export function listCampaignMessages(
  id: string,
  params: MessageListParams = {}
): Promise<PaginatedDataResponse<CampaignMessage>> {
  return apiClient<PaginatedDataResponse<CampaignMessage>>(
    `/admin/campaigns/${id}/messages${buildQueryString(params as Record<string, unknown>, { arrayKeys: ["status"] })}`
  )
}

// --- Automatic campaigns ---

export function listAutomaticCampaigns(
  params: AutomaticCampaignListParams = {}
): Promise<PaginatedDataResponse<AutomaticCampaign>> {
  return apiClient<PaginatedDataResponse<AutomaticCampaign>>(
    `/admin/automatic-campaigns${buildQueryString(params as Record<string, unknown>)}`
  )
}

export function getAutomaticCampaign(id: string): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(`/admin/automatic-campaigns/${id}`)
}

export function createAutomaticCampaign(
  input: CreateAutomaticCampaignInput
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>("/admin/automatic-campaigns", {
    method: "POST",
    body: JSON.stringify(prepareAutomaticPayload(input)),
  })
}

export function updateAutomaticCampaign(
  id: string,
  input: UpdateAutomaticCampaignInput
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(`/admin/automatic-campaigns/${id}`, {
    method: "PATCH",
    body: JSON.stringify(prepareAutomaticPayload(input)),
  })
}

export function updateAutomaticCampaignStatus(
  id: string,
  status: AutomaticCampaignStatus
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(
    `/admin/automatic-campaigns/${id}/status`,
    {
      method: "PATCH",
      body: JSON.stringify({ status }),
    }
  )
}

export function toggleAutomaticCampaignActive(
  id: string
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(
    `/admin/automatic-campaigns/${id}/toggle-active`,
    { method: "PATCH" }
  )
}

export function reprocessAutomaticCampaign(
  id: string
): Promise<ReprocessResponse> {
  return apiClient<ReprocessResponse>(
    `/admin/automatic-campaigns/${id}/reprocess`,
    { method: "POST" }
  )
}

export function deleteAutomaticCampaign(
  id: string
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(`/admin/automatic-campaigns/${id}`, {
    method: "DELETE",
  })
}

export function restoreAutomaticCampaign(
  id: string
): Promise<AutomaticCampaign> {
  return apiClient<AutomaticCampaign>(
    `/admin/automatic-campaigns/${id}/restore`,
    { method: "POST" }
  )
}

export function listAutomaticCampaignMessages(
  id: string,
  params: MessageListParams = {}
): Promise<PaginatedDataResponse<CampaignMessage>> {
  return apiClient<PaginatedDataResponse<CampaignMessage>>(
    `/admin/automatic-campaigns/${id}/messages${buildQueryString(params as Record<string, unknown>, { arrayKeys: ["status"] })}`
  )
}
