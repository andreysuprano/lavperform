import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { metaIntegrationService } from '@/services'

export function useMetaIntegrationAvailability(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.channels.whatsappBusinessApi.availability(
      companyId || ''
    ),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await metaIntegrationService.getAvailability(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useMetaIntegration(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.channels.whatsappBusinessApi.detail(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')

      try {
        const response = await metaIntegrationService.getIntegration(companyId)
        return response.data
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 30,
    retry: false,
  })
}
