"use client"

import { useQuery } from "@tanstack/react-query"

import {
  getBusinessPartner,
  listBusinessPartners,
} from "./business-partners-api"

export const businessPartnerKeys = {
  all: ["business-partners"] as const,
  lists: () => [...businessPartnerKeys.all, "list"] as const,
  list: () => [...businessPartnerKeys.lists()] as const,
  details: () => [...businessPartnerKeys.all, "detail"] as const,
  detail: (id: string) => [...businessPartnerKeys.details(), id] as const,
}

export function useBusinessPartners() {
  return useQuery({
    queryKey: businessPartnerKeys.list(),
    queryFn: () => listBusinessPartners(),
    staleTime: 5 * 60_000,
  })
}

export function useBusinessPartner(id: string | null | undefined) {
  return useQuery({
    queryKey: id
      ? businessPartnerKeys.detail(id)
      : businessPartnerKeys.detail("__none__"),
    queryFn: () => getBusinessPartner(id as string),
    enabled: Boolean(id),
    staleTime: 5 * 60_000,
  })
}
