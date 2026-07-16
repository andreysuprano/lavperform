import { useMutation, useQueryClient } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { campaignAttributionService } from '@/services'
import type { UpdateSegmentAttributionPayload } from '@/types'

export function useUpdateAttributionSegment() {
  const queryClient = useQueryClient()
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async (payload: UpdateSegmentAttributionPayload) => {
      if (!selectedCompany?.id) {
        throw new Error('Company ID is required')
      }
      const response =
        await campaignAttributionService.updateSegmentAttribution(
          selectedCompany.id,
          payload
        )
      return response.data
    },
    onSuccess: async () => {
      if (!selectedCompany?.id) return
      await queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.attributionSegments(selectedCompany.id),
      })
    },
  })
}

