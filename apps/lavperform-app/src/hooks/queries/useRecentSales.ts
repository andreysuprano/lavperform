import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { ordersService } from '@/services'
import {
  mapSalesResponseToRecentSalesData,
  type RecentSalesData,
} from '@/utils/orders/mapDashboardPerformance'

export type RecentSalesParams = {
  page: number
  limit: number
}

export type { RecentSalesData }

export function useRecentSales(
  companyId: string | undefined,
  params: RecentSalesParams
) {
  return useQuery({
    queryKey: queryKeys.orders.sales(
      companyId || '',
      params.page,
      params.limit
    ),
    queryFn: async (): Promise<RecentSalesData> => {
      if (!companyId) throw new Error('Company ID is required')

      const response = await ordersService.getSales(companyId, {
        page: params.page,
        limit: params.limit,
      })

      return mapSalesResponseToRecentSalesData(response.data)
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}
