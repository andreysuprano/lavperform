import { apiClient } from "@/services/api-client"

import type {
  DefaultCreditProduct,
  DefaultProductListParams,
  Plan,
  PlanListParams,
} from "./types"

function buildQueryString(params: object): string {
  const record = params as Record<string, string | number | boolean | undefined>
  const search = new URLSearchParams()
  Object.entries(record).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

export function listPlans(params: PlanListParams = {}): Promise<Plan[]> {
  return apiClient<Plan[]>(`/admin/billing/plans${buildQueryString(params)}`)
}

export function getPlan(id: string): Promise<Plan> {
  return apiClient<Plan>(`/admin/billing/plans/${id}`)
}

export function createPlan(body: Record<string, unknown>): Promise<Plan> {
  return apiClient<Plan>("/admin/billing/plans", {
    method: "POST",
    body: JSON.stringify(body),
  })
}

export function updatePlan(
  id: string,
  body: Record<string, unknown>
): Promise<Plan> {
  return apiClient<Plan>(`/admin/billing/plans/${id}`, {
    method: "PUT",
    body: JSON.stringify(body),
  })
}

export function togglePlanActive(id: string): Promise<Plan> {
  return apiClient<Plan>(`/admin/billing/plans/${id}/toggle-active`, {
    method: "PUT",
  })
}

export function deletePlan(id: string): Promise<void> {
  return apiClient<void>(`/admin/billing/plans/${id}`, { method: "DELETE" })
}

export function listDefaultProducts(
  params: DefaultProductListParams = {}
): Promise<DefaultCreditProduct[]> {
  return apiClient<DefaultCreditProduct[]>(
    `/admin/billing/credits/default-products${buildQueryString(params)}`
  )
}

export function getDefaultProduct(id: string): Promise<DefaultCreditProduct> {
  return apiClient<DefaultCreditProduct>(
    `/admin/billing/credits/default-products/${id}`
  )
}

export function createDefaultProduct(
  body: Record<string, unknown>
): Promise<DefaultCreditProduct> {
  return apiClient<DefaultCreditProduct>(
    "/admin/billing/credits/default-products",
    { method: "POST", body: JSON.stringify(body) }
  )
}

export function updateDefaultProduct(
  id: string,
  body: Record<string, unknown>
): Promise<DefaultCreditProduct> {
  return apiClient<DefaultCreditProduct>(
    `/admin/billing/credits/default-products/${id}`,
    { method: "PUT", body: JSON.stringify(body) }
  )
}

export function toggleDefaultProductActive(
  id: string
): Promise<DefaultCreditProduct> {
  return apiClient<DefaultCreditProduct>(
    `/admin/billing/credits/default-products/${id}/toggle-active`,
    { method: "PUT" }
  )
}

export function restoreDefaultProduct(
  id: string
): Promise<DefaultCreditProduct> {
  return apiClient<DefaultCreditProduct>(
    `/admin/billing/credits/default-products/${id}/restore`,
    { method: "PUT" }
  )
}

export function deleteDefaultProduct(id: string): Promise<void> {
  return apiClient<void>(
    `/admin/billing/credits/default-products/${id}`,
    { method: "DELETE" }
  )
}
