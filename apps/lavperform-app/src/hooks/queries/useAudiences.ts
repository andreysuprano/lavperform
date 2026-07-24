import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { audienceService } from '@/services/audience.service'
import type {
  AudienceDefinition,
  CreateAudienceRequest,
  UpdateAudienceRequest,
} from '@/types'

export function useAudiences(
  companyId: string | undefined,
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: queryKeys.audiences.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await audienceService.list(companyId, params)
      return response.data
    },
    enabled: !!companyId,
  })
}

export function useAudience(companyId: string | undefined, audienceId?: string) {
  return useQuery({
    queryKey: queryKeys.audiences.detail(companyId || '', audienceId || ''),
    queryFn: async () => {
      if (!companyId || !audienceId) throw new Error('IDs are required')
      const response = await audienceService.getById(companyId, audienceId)
      return response.data
    },
    enabled: !!companyId && !!audienceId,
  })
}

export function useAudienceCriteria(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.audiences.criteria(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await audienceService.getCriteria(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: Infinity,
  })
}

export function useAudiencePreview(
  companyId: string | undefined,
  definition: AudienceDefinition | undefined,
  enabled = true,
) {
  return useQuery({
    queryKey: queryKeys.audiences.preview(companyId || '', definition),
    queryFn: async () => {
      if (!companyId || !definition) throw new Error('Preview data is required')
      const response = await audienceService.preview(companyId, definition)
      return response.data
    },
    enabled: !!companyId && !!definition && enabled,
    staleTime: 1000 * 30,
  })
}

export function useCreateAudience() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string
      data: CreateAudienceRequest
    }) => {
      const response = await audienceService.create(companyId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.audiences.lists(variables.companyId),
      })
    },
  })
}

export function useUpdateAudience() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      audienceId,
      data,
    }: {
      companyId: string
      audienceId: string
      data: UpdateAudienceRequest
    }) => {
      const response = await audienceService.update(companyId, audienceId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.audiences.lists(variables.companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.audiences.detail(
          variables.companyId,
          variables.audienceId,
        ),
      })
    },
  })
}

export function useDeleteAudience() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      audienceId,
    }: {
      companyId: string
      audienceId: string
    }) => {
      await audienceService.remove(companyId, audienceId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.audiences.lists(variables.companyId),
      })
    },
  })
}
