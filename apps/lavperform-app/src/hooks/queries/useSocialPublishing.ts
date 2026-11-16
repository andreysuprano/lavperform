import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toaster } from '@/components/ui/toaster'
import { queryKeys } from '@/lib/react-query'
import { publishingErrorMessage, socialPublishingService } from '@/services/socialPublishing.service'

export function useConnections(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.company.socialConnections(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () => (await socialPublishingService.connections(companyId ?? '')).data,
  })
}

export function useScheduledPosts(companyId?: string, from?: string, to?: string) {
  return useQuery({
    queryKey: queryKeys.company.scheduledPosts(companyId ?? '', from ?? '', to ?? ''),
    enabled: Boolean(companyId && from && to),
    queryFn: async () =>
      (await socialPublishingService.posts(companyId ?? '', from ?? '', to ?? '')).data,
  })
}

export function useScheduleSlots() {
  return useQuery({
    queryKey: ['social-publishing', 'slots'],
    queryFn: async () => (await socialPublishingService.suggestions()).data.slots,
  })
}

export function useGoogleProfile(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.company.googleProfile(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () => (await socialPublishingService.googleProfile(companyId ?? '')).data,
  })
}

function invalidate(queryClient: ReturnType<typeof useQueryClient>, companyId: string) {
  queryClient.invalidateQueries({ queryKey: queryKeys.company.socialConnections(companyId) })
  queryClient.invalidateQueries({ queryKey: ['company', 'scheduled-posts', companyId] })
  queryClient.invalidateQueries({ queryKey: queryKeys.company.googleProfile(companyId) })
}

export function useConnectionActions(companyId: string) {
  const queryClient = useQueryClient()
  const refresh = () => invalidate(queryClient, companyId)
  const fail = (error: unknown) =>
    toaster.create({
      title: publishingErrorMessage(error, 'Não foi possível concluir agora'),
      type: 'error',
    })
  return {
    start: useMutation({
      mutationFn: (provider: string) => socialPublishingService.start(companyId, provider),
      onSuccess: refresh,
      onError: fail,
    }),
    cancel: useMutation({
      mutationFn: (provider: string) => socialPublishingService.cancel(companyId, provider),
      onSuccess: refresh,
    }),
    disconnect: useMutation({
      mutationFn: (provider: string) => socialPublishingService.disconnect(companyId, provider),
      onSuccess: refresh,
    }),
    retry: useMutation({
      mutationFn: (provider: string) => socialPublishingService.retry(companyId, provider),
      onSuccess: refresh,
      onError: fail,
    }),
    selectMeta: useMutation({
      mutationFn: (body: { pageId: string; igUserId?: string; adAccountId?: string }) =>
        socialPublishingService.selectMeta(companyId, body),
      onSuccess: refresh,
      onError: fail,
    }),
    selectGoogle: useMutation({
      mutationFn: (body: { locationId: string; adCustomerId?: string }) =>
        socialPublishingService.selectGoogle(companyId, body),
      onSuccess: refresh,
      onError: fail,
    }),
    seed: useMutation({
      mutationFn: () => socialPublishingService.seed(companyId),
      onSuccess: () => {
        refresh()
        toaster.create({ title: 'Dados de teste carregados', type: 'success' })
      },
      onError: fail,
    }),
  }
}

export function usePostActions(companyId: string) {
  const queryClient = useQueryClient()
  const refresh = () => invalidate(queryClient, companyId)
  const fail = (error: unknown) =>
    toaster.create({
      title: publishingErrorMessage(error, 'Não foi possível salvar o post'),
      type: 'error',
    })
  return {
    create: useMutation({
      mutationFn: (body: Record<string, unknown>) => socialPublishingService.createPost(body),
      onSuccess: refresh,
      onError: fail,
    }),
    update: useMutation({
      mutationFn: (input: { id: string; body: Record<string, unknown> }) =>
        socialPublishingService.updatePost(input.id, input.body),
      onSuccess: refresh,
      onError: fail,
    }),
    cancel: useMutation({
      mutationFn: (id: string) => socialPublishingService.cancelPost(id),
      onSuccess: refresh,
      onError: fail,
    }),
    retry: useMutation({
      mutationFn: (id: string) => socialPublishingService.retryPost(id),
      onSuccess: refresh,
      onError: fail,
    }),
  }
}

export function useReplyReview(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: { reviewId: string; comment: string }) =>
      socialPublishingService.replyReview(companyId, input.reviewId, input.comment),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.company.googleProfile(companyId) })
      toaster.create({ title: 'Resposta publicada', type: 'success' })
    },
    onError: (error) =>
      toaster.create({
        title: publishingErrorMessage(error, 'Não foi possível responder'),
        type: 'error',
      }),
  })
}
