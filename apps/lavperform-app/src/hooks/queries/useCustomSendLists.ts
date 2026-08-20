import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { customSendListService } from '@/services/customSendList.service'
import type {
  CreateCustomSendListRequest,
  ReplaceCustomSendListMembersRequest,
  UpdateCustomSendListRequest,
} from '@/types'

export function useCustomSendLists(
  companyId: string | undefined,
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: queryKeys.customSendLists.list(companyId || '', params),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customSendListService.list(companyId, params)
      return response.data
    },
    enabled: !!companyId,
  })
}

export function useCustomSendList(
  companyId: string | undefined,
  listId?: string,
  params: { page?: number; limit?: number } = {},
) {
  return useQuery({
    queryKey: queryKeys.customSendLists.detail(companyId || '', listId || '', params),
    queryFn: async () => {
      if (!companyId || !listId) throw new Error('IDs are required')
      const response = await customSendListService.getById(companyId, listId, params)
      return response.data
    },
    enabled: !!companyId && !!listId,
  })
}

export function useCustomSendListMemberIds(
  companyId: string | undefined,
  listId?: string,
) {
  return useQuery({
    queryKey: queryKeys.customSendLists.memberIds(companyId || '', listId || ''),
    queryFn: async () => {
      if (!companyId || !listId) throw new Error('IDs are required')
      const response = await customSendListService.getMemberIds(companyId, listId)
      return response.data.customerIds
    },
    enabled: !!companyId && !!listId,
  })
}

export function useCustomSendListEligibleCount(
  companyId: string | undefined,
  listId?: string | null,
  channel?: string,
) {
  return useQuery({
    queryKey: queryKeys.customSendLists.eligibleCount(
      companyId || '',
      listId || '',
      channel,
    ),
    queryFn: async () => {
      if (!companyId || !listId) throw new Error('IDs are required')
      const response = await customSendListService.getEligibleCount(
        companyId,
        listId,
        channel,
      )
      return response.data
    },
    enabled: !!companyId && !!listId,
    staleTime: 1000 * 30,
  })
}

export function useCreateCustomSendList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string
      data: CreateCustomSendListRequest
    }) => {
      const response = await customSendListService.create(companyId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.lists(variables.companyId),
      })
    },
  })
}

export function useUpdateCustomSendList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      listId,
      data,
    }: {
      companyId: string
      listId: string
      data: UpdateCustomSendListRequest
    }) => {
      const response = await customSendListService.update(companyId, listId, data)
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.lists(variables.companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.detail(
          variables.companyId,
          variables.listId,
        ),
      })
    },
  })
}

export function useReplaceCustomSendListMembers() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      listId,
      data,
    }: {
      companyId: string
      listId: string
      data: ReplaceCustomSendListMembersRequest
    }) => {
      const response = await customSendListService.replaceMembers(
        companyId,
        listId,
        data,
      )
      return response.data
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.lists(variables.companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.detail(
          variables.companyId,
          variables.listId,
        ),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.memberIds(
          variables.companyId,
          variables.listId,
        ),
      })
    },
  })
}

export function useDeleteCustomSendList() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      listId,
    }: {
      companyId: string
      listId: string
    }) => {
      await customSendListService.remove(companyId, listId)
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.customSendLists.lists(variables.companyId),
      })
    },
  })
}
