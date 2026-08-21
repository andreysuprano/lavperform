import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { ordersService } from '@/services'
import type { IncentivizedSalesParams } from '@/types'

function paramsKey(params: IncentivizedSalesParams): string {
  if (params.startDate && params.endDate) {
    return `${params.startDate}:${params.endDate}`
  }
  return 'all'
}

export function useIncentivizedSales(
  companyId: string | undefined,
  params: IncentivizedSalesParams = {},
  options?: { enabled?: boolean }
) {
  return useQuery({
    queryKey: queryKeys.saleAttribution.incentivizedSales(
      companyId || '',
      paramsKey(params)
    ),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await ordersService.getIncentivizedSales(
        companyId,
        params
      )
      return response.data
    },
    enabled: !!companyId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}
