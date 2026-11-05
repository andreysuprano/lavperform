import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { audienceService } from '@/services/audience.service'
import type {
  Audience,
  AudienceDefinition,
  AudiencesListResponse,
  CreateAudienceRequest,
  UpdateAudienceRequest,
} from '@/types'

const AUDIENCE_PAGE_SIZE = 100

async function listEveryAudience(
  companyId: string,
): Promise<AudiencesListResponse> {
  const first = await audienceService.list(companyId, {
    page: 1,
    limit: AUDIENCE_PAGE_SIZE,
  })
  const items: Audience[] = [...first.data.data]
  const totalPages = first.data.meta?.totalPages ?? 1

  for (let page = 2; page <= totalPages; page += 1) {
    const next = await audienceService.list(companyId, {
      page,
      limit: AUDIENCE_PAGE_SIZE,
    })
    items.push(...next.data.data)
  }

  return {
    data: items,
    meta: {
      ...first.data.meta,
      total: first.data.meta?.total ?? items.length,
      page: 1,
      limit: items.length || AUDIENCE_PAGE_SIZE,
      totalPages: 1,
    },
  }
}

export function useAudiences(
  companyId: string | undefined,
  _params: { page?: number; limit?: number } = {},
) {
  // page/limit antigo criava um cache por tela e a lista da campanha ficava para trás.
  void _params

  return useQuery({
    queryKey: queryKeys.audiences.lists(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      return listEveryAudience(companyId)
    },
    enabled: !!companyId,
    refetchOnMount: 'always',
    staleTime: 0,
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
  params: { page?: number; limit?: number } = {},
) {
  const page = params.page ?? 1
  const limit = params.limit ?? 50

  return useQuery({
    queryKey: queryKeys.audiences.preview(companyId || '', definition, {
      page,
      limit,
    }),
    queryFn: async () => {
      if (!companyId || !definition) throw new Error('Preview data is required')
      const response = await audienceService.preview(companyId, definition, {
        page,
        limit,
      })
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
        refetchType: 'all',
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
        refetchType: 'all',
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.audiences.detail(
          variables.companyId,
          variables.audienceId,
        ),
        refetchType: 'all',
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
        refetchType: 'all',
      })
    },
  })
}
