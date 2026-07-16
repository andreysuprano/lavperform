import { apiClient } from "@/services/api-client"

import type { BusinessPartner } from "./types"

export function listBusinessPartners(): Promise<BusinessPartner[]> {
  return apiClient<BusinessPartner[]>("/admin/business-partners")
}

export function getBusinessPartner(id: string): Promise<BusinessPartner> {
  return apiClient<BusinessPartner>(`/admin/business-partners/${id}`)
}
