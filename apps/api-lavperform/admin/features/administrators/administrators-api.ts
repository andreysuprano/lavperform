import { apiClient } from "@/services/api-client"

import type {
  AdministratorListParams,
  PaginatedResponse,
  PanelAdministrator,
} from "./types"
import type {
  ChangeAdministratorPasswordInput,
  CreateAdministratorInput,
  UpdateAdministratorInput,
} from "./schemas"

function buildQueryString(params: AdministratorListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

export function listAdministrators(
  params: AdministratorListParams = {}
): Promise<PaginatedResponse<PanelAdministrator>> {
  return apiClient<PaginatedResponse<PanelAdministrator>>(
    `/admin/administrators${buildQueryString(params)}`
  )
}

export function getAdministrator(id: string): Promise<PanelAdministrator> {
  return apiClient<PanelAdministrator>(`/admin/administrators/${id}`)
}

export function createAdministrator(
  input: CreateAdministratorInput
): Promise<PanelAdministrator> {
  return apiClient<PanelAdministrator>("/admin/administrators", {
    method: "POST",
    body: JSON.stringify(input),
  })
}

export function updateAdministrator(
  id: string,
  input: UpdateAdministratorInput
): Promise<PanelAdministrator> {
  return apiClient<PanelAdministrator>(`/admin/administrators/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  })
}

export function changeAdministratorPassword(
  id: string,
  input: ChangeAdministratorPasswordInput
): Promise<PanelAdministrator> {
  return apiClient<PanelAdministrator>(
    `/admin/administrators/${id}/password`,
    {
      method: "PATCH",
      body: JSON.stringify(input),
    }
  )
}
