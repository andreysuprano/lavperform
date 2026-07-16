import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { queryKeys } from '@/lib/react-query'
import { metaTemplatesService } from '@/services'
import type { CreateMetaTemplatePayload } from '@/types/metaTemplate.types'

const AUTO_SYNC_INTERVAL_MS = 1000 * 60

export function useMetaTemplates(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.metaTemplates.list(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await metaTemplatesService.list(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 30,
  })
}

export function useMetaTemplatesWithAutoSync(companyId: string | undefined) {
  const syncAll = useSyncAllMetaTemplates(companyId)
  const syncAllRef = useRef(syncAll.mutate)

  useEffect(() => {
    syncAllRef.current = syncAll.mutate
  }, [syncAll.mutate])

  useEffect(() => {
    if (!companyId) return

    const runSync = () => {
      syncAllRef.current(undefined, { onError: () => undefined })
    }

    runSync()
    const intervalId = window.setInterval(runSync, AUTO_SYNC_INTERVAL_MS)
    return () => window.clearInterval(intervalId)
  }, [companyId])

  const query = useMetaTemplates(companyId)

  return {
    ...query,
    isSyncing: syncAll.isPending,
  }
}

export function useCreateMetaTemplate(companyId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: CreateMetaTemplatePayload) => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await metaTemplatesService.create(companyId, payload)
      return response.data
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.metaTemplates.list(companyId),
        })
      }
    },
  })
}

export function useSyncMetaTemplate(companyId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (templateId: string) => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await metaTemplatesService.syncStatus(
        companyId,
        templateId
      )
      return response.data
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.metaTemplates.list(companyId),
        })
      }
    },
  })
}

export function useSyncAllMetaTemplates(companyId: string | undefined) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await metaTemplatesService.syncAll(companyId)
      return response.data
    },
    onSuccess: () => {
      if (companyId) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.metaTemplates.list(companyId),
        })
      }
    },
  })
}
