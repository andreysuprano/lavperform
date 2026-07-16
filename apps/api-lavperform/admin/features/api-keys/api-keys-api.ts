import { apiClient } from "@/services/api-client"

import type {
  CreatePublicApiKeyInput,
  CreatePublicApiKeyResponse,
  PublicApiKey,
} from "./types"

export function listCompanyApiKeys(companyId: string): Promise<PublicApiKey[]> {
  return apiClient<PublicApiKey[]>(`/admin/companies/${companyId}/api-keys`)
}

export function createCompanyApiKey(
  companyId: string,
  body: CreatePublicApiKeyInput
): Promise<CreatePublicApiKeyResponse> {
  return apiClient<CreatePublicApiKeyResponse>(
    `/admin/companies/${companyId}/api-keys`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export function revokeCompanyApiKey(
  companyId: string,
  apiKeyId: string
): Promise<PublicApiKey> {
  return apiClient<PublicApiKey>(
    `/admin/companies/${companyId}/api-keys/${apiKeyId}/revoke`,
    { method: "PATCH" }
  )
}

export function deleteCompanyApiKey(
  companyId: string,
  apiKeyId: string
): Promise<void> {
  return apiClient<void>(`/admin/companies/${companyId}/api-keys/${apiKeyId}`, {
    method: "DELETE",
  })
}

export function getActiveCompanyApiKey(
  companyId: string
): Promise<CreatePublicApiKeyResponse> {
  return apiClient<CreatePublicApiKeyResponse>(
    `/admin/companies/${companyId}/api-keys/active`
  )
}

export function rotateCompanyApiKey(
  companyId: string,
  body: CreatePublicApiKeyInput
): Promise<CreatePublicApiKeyResponse> {
  return apiClient<CreatePublicApiKeyResponse>(
    `/admin/companies/${companyId}/api-keys/rotate`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}
