import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toaster } from '@/components/ui/toaster'
import { queryKeys } from '@/lib/react-query'
import { apiErrorMessage, socialPostsService } from '@/services'
import type {
  CreateDraftPayload,
  SaveBrandPayload,
  SocialPostDraft,
  UpdateVariationPayload,
} from '@/types'

export function useBrandIdentity(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.company.brandIdentity(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const response = await socialPostsService.getBrand(companyId ?? '')
      return response.data
    },
  })
}

export function useSaveBrandIdentity(companyId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (payload: SaveBrandPayload) => {
      const response = await socialPostsService.saveBrand(companyId, payload)
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.company.brandIdentity(companyId), data)
      toaster.create({ title: 'Identidade salva', type: 'success' })
    },
    onError: (error) => {
      toaster.create({
        title: apiErrorMessage(error, 'Não foi possível salvar a identidade'),
        type: 'error',
      })
    },
  })
}

export function useSocialDrafts(companyId?: string) {
  return useQuery({
    queryKey: queryKeys.company.socialDrafts(companyId ?? ''),
    enabled: Boolean(companyId),
    queryFn: async () => {
      const response = await socialPostsService.listDrafts(companyId ?? '')
      return response.data
    },
  })
}

export function useSocialDraft(draftId?: string) {
  return useQuery({
    queryKey: queryKeys.company.socialDraft(draftId ?? ''),
    enabled: Boolean(draftId),
    queryFn: async () => {
      const response = await socialPostsService.getDraft(draftId ?? '')
      return response.data
    },
  })
}

function useDraftMutation(
  draftId: string,
  action: () => Promise<{ data: SocialPostDraft }>,
  errorTitle: string
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => (await action()).data,
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.company.socialDraft(draftId), data)
    },
    onError: (error) => {
      toaster.create({
        title: apiErrorMessage(error, errorTitle),
        type: 'error',
      })
    },
  })
}

export function useGenerateSocialDraft(draftId: string) {
  return useDraftMutation(
    draftId,
    () => socialPostsService.generate(draftId),
    'Não foi possível gerar as variações'
  )
}

export function useGenerateMoreVariations(draftId: string) {
  return useDraftMutation(
    draftId,
    () => socialPostsService.generateMore(draftId),
    'Não foi possível gerar mais variações'
  )
}

export function useSelectVariation(draftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (variationId: string) => {
      const response = await socialPostsService.selectVariation(
        draftId,
        variationId
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.company.socialDraft(draftId), data)
    },
  })
}

export function useUpdateVariation(draftId: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      variationId: string
      payload: UpdateVariationPayload
    }) => {
      const response = await socialPostsService.updateVariation(
        input.variationId,
        input.payload
      )
      return response.data
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.company.socialDraft(draftId),
      })
    },
  })
}

export function useCreateSocialDraft() {
  return useMutation({
    mutationFn: async (payload: CreateDraftPayload) => {
      const response = await socialPostsService.createDraft(payload)
      return response.data
    },
    onError: (error) => {
      toaster.create({
        title: apiErrorMessage(error, 'Não foi possível criar o rascunho'),
        type: 'error',
      })
    },
  })
}
