import { apiClient } from "@/services/api-client"

import type {
  CompanyIntegration,
  ImportHistoryResult,
  IntegrationPartner,
} from "./types"
import type { ImportHistoryInput } from "./schemas"

export function listIntegrationPartners(): Promise<IntegrationPartner[]> {
  return apiClient<IntegrationPartner[]>("/admin/integrations/partners")
}

export function listCompanyIntegrations(
  companyId: string,
  revealSecrets = false
): Promise<CompanyIntegration[]> {
  const qs = revealSecrets ? "?revealSecrets=true" : ""
  return apiClient<CompanyIntegration[]>(
    `/admin/companies/${companyId}/integrations${qs}`
  )
}

export function getCompanyIntegration(
  companyId: string,
  integrationId: string,
  revealSecrets = false
): Promise<CompanyIntegration> {
  const qs = revealSecrets ? "?revealSecrets=true" : ""
  return apiClient<CompanyIntegration>(
    `/admin/companies/${companyId}/integrations/${integrationId}${qs}`
  )
}

export function createCompanyIntegration(
  companyId: string,
  body: Record<string, unknown>
): Promise<CompanyIntegration> {
  return apiClient<CompanyIntegration>(
    `/admin/companies/${companyId}/integrations`,
    {
      method: "POST",
      body: JSON.stringify(body),
    }
  )
}

export function updateCompanyIntegration(
  companyId: string,
  integrationId: string,
  body: Record<string, unknown>
): Promise<CompanyIntegration> {
  return apiClient<CompanyIntegration>(
    `/admin/companies/${companyId}/integrations/${integrationId}`,
    {
      method: "PATCH",
      body: JSON.stringify(body),
    }
  )
}

export function toggleIntegrationActive(
  companyId: string,
  integrationId: string,
  active: boolean
): Promise<CompanyIntegration> {
  return apiClient<CompanyIntegration>(
    `/admin/companies/${companyId}/integrations/${integrationId}/active`,
    {
      method: "PATCH",
      body: JSON.stringify({ active }),
    }
  )
}

export function deleteCompanyIntegration(
  companyId: string,
  integrationId: string
): Promise<void> {
  return apiClient<void>(
    `/admin/companies/${companyId}/integrations/${integrationId}`,
    { method: "DELETE" }
  )
}

export function importIntegrationHistory(
  companyId: string,
  integrationId: string,
  body: ImportHistoryInput = {}
): Promise<ImportHistoryResult> {
  const payload: ImportHistoryInput = {}
  if (body.startDate) payload.startDate = body.startDate
  if (body.endDate) payload.endDate = body.endDate

  return apiClient<ImportHistoryResult>(
    `/admin/companies/${companyId}/integrations/${integrationId}/import-history`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    }
  )
}
