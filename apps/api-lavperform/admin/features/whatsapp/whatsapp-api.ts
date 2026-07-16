import { apiClient } from "@/services/api-client"

import type {
  CompanyWhatsappResponse,
  CreateWhatsappInstanceResponse,
  GlobalWebhookConfig,
  RestartApplicationResponse,
  RotateTokenResponse,
  WebhookErrorEntry,
  WhatsappConnectionLink,
  WhatsappInstanceListItem,
} from "./types"
import type {
  CreateInstanceInput,
  GlobalWebhookInput,
  UpdateAdminFieldsInput,
} from "./schemas"
import { buildAdminFieldsPayload, buildWebhookPayload } from "./schemas"

export function listWhatsappInstances(): Promise<WhatsappInstanceListItem[]> {
  return apiClient<WhatsappInstanceListItem[]>("/admin/whatsapp/instances")
}

export function getCompanyWhatsappInstance(
  companyId: string
): Promise<CompanyWhatsappResponse> {
  return apiClient<CompanyWhatsappResponse>(
    `/admin/whatsapp/instances/company/${companyId}`
  )
}

export function createWhatsappInstance(
  input: CreateInstanceInput
): Promise<CreateWhatsappInstanceResponse> {
  return apiClient<CreateWhatsappInstanceResponse>("/admin/whatsapp/instances", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateInstanceAdminFields(
  instanceToken: string,
  input: UpdateAdminFieldsInput
): Promise<Record<string, unknown>> {
  return apiClient<Record<string, unknown>>(
    `/admin/whatsapp/instances/${encodeURIComponent(instanceToken)}/admin-fields`,
    {
      method: "POST",
      body: JSON.stringify(buildAdminFieldsPayload(input)),
    }
  )
}

export function getGlobalWebhook(): Promise<GlobalWebhookConfig> {
  return apiClient<GlobalWebhookConfig>("/admin/whatsapp/webhook/global")
}

export function setGlobalWebhook(
  input: GlobalWebhookInput
): Promise<GlobalWebhookConfig> {
  return apiClient<GlobalWebhookConfig>("/admin/whatsapp/webhook/global", {
    method: "POST",
    body: JSON.stringify(buildWebhookPayload(input)),
  })
}

export function getGlobalWebhookErrors(): Promise<WebhookErrorEntry[]> {
  return apiClient<WebhookErrorEntry[]>("/admin/whatsapp/webhook/global/errors")
}

export function restartWhatsappApplication(): Promise<RestartApplicationResponse> {
  return apiClient<RestartApplicationResponse>("/admin/whatsapp/restart", {
    method: "POST",
  })
}

export function rotateWhatsappAdminToken(): Promise<RotateTokenResponse> {
  return apiClient<RotateTokenResponse>("/admin/whatsapp/token/rotate", {
    method: "POST",
  })
}

export function createConnectionLink(input: {
  companyId: string
  instanceToken?: string
  publicBaseUrl?: string
}): Promise<WhatsappConnectionLink> {
  return apiClient<WhatsappConnectionLink>("/admin/whatsapp/connection-links", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function listConnectionLinks(
  companyId: string
): Promise<WhatsappConnectionLink[]> {
  const qs = new URLSearchParams({ companyId }).toString()
  return apiClient<WhatsappConnectionLink[]>(
    `/admin/whatsapp/connection-links?${qs}`
  )
}

export function revokeConnectionLink(linkId: string): Promise<{ message: string }> {
  return apiClient<{ message: string }>(
    `/admin/whatsapp/connection-links/${linkId}/revoke`,
    { method: "POST" }
  )
}
