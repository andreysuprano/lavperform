"use client"

import { useQuery } from "@tanstack/react-query"

import { listCompanyCoupons } from "./coupons-api"
import type { CouponListParams } from "./types"

export const couponKeys = {
  all: ["coupons"] as const,
  lists: () => [...couponKeys.all, "list"] as const,
  list: (companyId: string, params?: CouponListParams) =>
    [...couponKeys.lists(), companyId, params ?? {}] as const,
}

export function useCompanyCoupons(
  companyId: string | null | undefined,
  params?: CouponListParams
) {
  return useQuery({
    queryKey: couponKeys.list(companyId ?? "__none__", params),
    queryFn: () => listCompanyCoupons(companyId as string, params),
    enabled: Boolean(companyId),
    staleTime: 60_000,
  })
}
