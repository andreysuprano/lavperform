import { useQuery } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { campaignAttributionService } from '@/services'

export function useAttributionSegments() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.campaigns.attributionSegments(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany?.id) {
        throw new Error('Company ID is required')
      }
      const response =
        await campaignAttributionService.listSegmentAttributions(
          selectedCompany.id
        )
      return response.data
    },
    enabled: !!selectedCompany?.id,
    staleTime: 1000 * 60 * 10,
  })
}

