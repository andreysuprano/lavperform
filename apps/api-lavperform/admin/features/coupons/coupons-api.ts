import { apiClient } from "@/services/api-client"

import type {
  CouponListParams,
  PaginatedCouponsResponse,
} from "./types"

function buildQueryString(params: CouponListParams): string {
  const search = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") return
    search.set(key, String(value))
  })
  const qs = search.toString()
  return qs.length > 0 ? `?${qs}` : ""
}

export function listCompanyCoupons(
  companyId: string,
  params: CouponListParams = {}
): Promise<PaginatedCouponsResponse> {
  return apiClient<PaginatedCouponsResponse>(
    `/admin/companies/${companyId}/coupons${buildQueryString({
      limit: 100,
      orderBy: "code",
      orderDirection: "asc",
      active: true,
      onlyValid: true,
      ...params,
    })}`
  )
}
