import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { partnerService } from '@/services'

export function useAllPartners(params?: {
  page?: number
  limit?: number
  orderDirection?: 'asc' | 'desc'
  name?: string
}) {
  return useQuery({
    queryKey: queryKeys.partners.list(params),
    queryFn: async () => {
      const response = await partnerService.listPartners(params)
      return response.data
    },
  })
}

export function usePartnerById(partnerId: string) {
  return useQuery({
    queryKey: queryKeys.partners.detail(partnerId),
    queryFn: async () => {
      const response = await partnerService.getPartner(partnerId)
      return response.data
    },
    enabled: !!partnerId,
  })
}
