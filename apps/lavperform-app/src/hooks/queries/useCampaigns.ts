import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { dateRangeToParams, type DateRangeValue } from '@/components'
import { invalidateQueries, queryKeys } from '@/lib/react-query'
import {
  couponService,
  recurringCampaignService,
  scheduledDispatchCampaignService,
} from '@/services'
import type {
  CompanyCoupon,
  PaginationMeta,
  RecurringCampaign,
  RecurringCampaignMessagesQuery,
} from '@/types'

function dateRangeQueryKey(value: DateRangeValue): string {
  return value.kind === 'preset'
    ? `p:${value.days}`
    : `c:${value.startDate}:${value.endDate}`
}

const DEFAULT_METRICS_RANGE: DateRangeValue = { kind: 'preset', days: 7 }

/**
 * Hook para listar campanhas automáticas
 */
export function useCampaigns(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.campaigns.lists(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await recurringCampaignService.listCampaigns(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para buscar detalhes de uma campanha
 */
export function useCampaign(
  campaignId: string | undefined,
  companyId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.campaigns.detail(campaignId || '', companyId || ''),
    queryFn: async () => {
      if (!campaignId || !companyId) {
        throw new Error('Campaign ID and Company ID are required')
      }
      const response = await recurringCampaignService.getCampaign(
        campaignId,
        companyId
      )
      return response.data
    },
    enabled: !!campaignId && !!companyId,
    staleTime: 1000 * 60 * 3, // 3 minutos
  })
}

/**
 * Hook para buscar métricas de uma campanha.
 * Aceita um `DateRangeValue` (preset 7/14/30 ou intervalo customizado).
 */
export function useCampaignMetrics(
  campaignId: string | undefined,
  companyId: string | undefined,
  dateRange: DateRangeValue = DEFAULT_METRICS_RANGE
) {
  return useQuery({
    queryKey: queryKeys.campaigns.metrics(
      campaignId || '',
      companyId || '',
      dateRangeQueryKey(dateRange)
    ),
    queryFn: async () => {
      if (!campaignId || !companyId) {
        throw new Error('Campaign ID and Company ID are required')
      }
      const params = dateRangeToParams(dateRange)
      const response = await recurringCampaignService.getCampaignMetrics(
        campaignId,
        companyId,
        params
      )
      return response.data
    },
    enabled: !!campaignId && !!companyId,
    staleTime: 1000 * 60 * 2,
    refetchInterval: 1000 * 60,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Serializa os filtros de mensagens em uma chave estável para o React Query.
 * Mantém a ordem de arrays com sort para que ?rfv=a,b e ?rfv=b,a cacheiem
 * na mesma entrada.
 */
function messagesQueryKey(query?: RecurringCampaignMessagesQuery): string {
  if (!query) return 'all'
  const rfv = [...(query.rfvClassification ?? [])].sort().join(',')
  const status = [...(query.status ?? [])].sort().join(',')
  return [
    query.startDate ?? '',
    query.endDate ?? '',
    rfv,
    status,
    query.page ?? '',
    query.limit ?? '',
    query.orderBy ?? '',
    query.orderDirection ?? '',
  ].join('|')
}

/**
 * Hook para buscar mensagens de uma campanha aceitando filtros opcionais
 * (período, classificação RFV, status, paginação).
 */
export function useCampaignMessages(
  campaignId: string | undefined,
  companyId: string | undefined,
  query?: RecurringCampaignMessagesQuery
) {
  return useQuery({
    queryKey: [
      ...queryKeys.campaigns.messages(campaignId || '', companyId || ''),
      messagesQueryKey(query),
    ] as const,
    queryFn: async () => {
      if (!campaignId || !companyId) {
        throw new Error('Campaign ID and Company ID are required')
      }
      const response = await recurringCampaignService.getCampaignMessages(
        campaignId,
        companyId,
        query
      )
      return response.data
    },
    enabled: !!campaignId && !!companyId,
    staleTime: 1000 * 60 * 2,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Hook para criar campanha automática
 */
export function useCreateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
    }: {
      companyId: string
      data: CreateAutomaticCampaignRequest
    }) => {
      const response = await recurringCampaignService.createCampaign(
        companyId,
        data
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de campanhas
      invalidateQueries.campaignsList(variables.companyId)
      // Invalida dados do dashboard
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      })
    },
  })
}

/**
 * Hook para editar campanha automática
 */
export function useUpdateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      data,
      campaignId,
    }: {
      companyId: string
      data: CreateAutomaticCampaignRequest | Partial<RecurringCampaign>
      campaignId: string
    }) => {
      const response = await recurringCampaignService.updateCampaign(
        companyId,
        data,
        campaignId
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de campanhas
      invalidateQueries.campaignsList(variables.companyId)
      // Invalida dados do dashboard
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      })
    },
  })
}

/**
 * Hook para ativar/desativar campanha
 */
export function useToggleCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      campaignId,
    }: {
      companyId: string
      campaignId: string
    }) => {
      const response = await recurringCampaignService.toggleCampaign(
        campaignId,
        companyId
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista e detalhe da campanha
      invalidateQueries.campaignsList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.campaigns.detail(
          variables.campaignId,
          variables.companyId
        ),
      })
    },
  })
}

/**
 * Hook para duplicar campanha automática
 */
export function useDuplicateCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      campaignId,
      targetType,
    }: {
      companyId: string
      campaignId: string
      targetType?: 'RECOGNITION' | 'SALES'
    }) => {
      const response = await recurringCampaignService.duplicateCampaign(
        campaignId,
        companyId,
        targetType
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de campanhas para refletir a campanha duplicada
      invalidateQueries.campaignsList(variables.companyId)
      // Invalida dados do dashboard
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      })
    },
  })
}

/**
 * Hook para deletar campanha
 */
export function useDeleteCampaign() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      companyId,
      campaignId,
    }: {
      companyId: string
      campaignId: string
    }) => {
      await recurringCampaignService.deleteCampaign(campaignId, companyId)
    },
    onSuccess: (_data, variables) => {
      // Invalida lista de campanhas
      invalidateQueries.campaignsList(variables.companyId)
      queryClient.invalidateQueries({
        queryKey: queryKeys.dashboard.all,
      })
    },
  })
}

/**
 * Tipagens para retorno dos hooks
 */
export type CampaignData = RecurringCampaign

/**
 * Hook para listar campanhas de disparo programado (scheduled dispatches)
 */
export function useScheduledDispatchCampaigns(
  companyId: string | undefined,
  params?: {
    page?: number
    limit?: number
    orderDirection?: 'asc' | 'desc'
    name?: string
  }
) {
  return useQuery({
    queryKey: queryKeys.campaigns.scheduledDispatches(
      companyId || '',
      JSON.stringify(params || {})
    ),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await scheduledDispatchCampaignService.listCampaigns(
        companyId,
        params
      )
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 3, // 3 minutos
  })
}

/**
 * Cupons da empresa (listagem para campanha e página dedicada).
 * Retorna { data: CompanyCoupon[], meta?: PaginationMeta }.
 * Quando `params` é fornecido, usa query key paginada; caso contrário,
 * usa a key base (sem params) para permitir prefixo de invalidação.
 */
export function useCompanyCoupons(
  companyId: string | undefined,
  params?: { page?: number; limit?: number }
) {
  return useQuery({
    queryKey: params
      ? queryKeys.campaigns.companyCouponsList(companyId || '', params)
      : queryKeys.campaigns.companyCoupons(companyId || ''),
    queryFn: async (): Promise<{ data: CompanyCoupon[]; meta?: PaginationMeta }> => {
      if (!companyId) throw new Error('Company ID is required')
      const { data: body } = await couponService.listCoupons(companyId, params)
      if (Array.isArray(body)) {
        return { data: body }
      }
      return { data: body.data, meta: body.meta }
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 2,
  })
}
