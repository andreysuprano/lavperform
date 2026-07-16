import { useQuery } from '@tanstack/react-query'

import { dateRangeToParams, type DateRangeValue } from '@/components'
import { queryKeys } from '@/lib/react-query'
import { dashboardService } from '@/services'
import type { DashCampaignsProps, DashCustomersProps } from '@/types'

/**
 * Serializa um `DateRangeValue` em uma chave estável para o React Query.
 */
function dateRangeQueryKey(value: DateRangeValue): string {
  return value.kind === 'preset'
    ? `p:${value.days}`
    : `c:${value.startDate}:${value.endDate}`
}

/**
 * Hook para buscar dados de clientes do dashboard
 */
export function useDashboardCustomers(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.dashboard.customers(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await dashboardService.getCustomers(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

const DEFAULT_RANGE: DateRangeValue = { kind: 'preset', days: 7 }

/**
 * Hook para buscar dados de campanhas do dashboard.
 * Aceita um `DateRangeValue` (preset 7/14/30 ou intervalo customizado).
 */
export function useDashboardCampaigns(
  companyId: string | undefined,
  dateRange: DateRangeValue = DEFAULT_RANGE
) {
  return useQuery({
    queryKey: queryKeys.dashboard.campaigns(
      companyId || '',
      dateRangeQueryKey(dateRange)
    ),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const params = dateRangeToParams(dateRange)
      const response = await dashboardService.getCampaigns(companyId, params)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}

/**
 * Tipagens para retorno dos hooks
 */
export type DashboardCustomersData = DashCustomersProps
export type DashboardCampaignsData = DashCampaignsProps
