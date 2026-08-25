import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { ordersService } from '@/services'
import {
  mapSalesResponseToRecentSalesData,
  type RecentSalesData,
} from '@/utils/orders/mapDashboardPerformance'
import { TODAY_SALES_PAGE_LIMIT } from '@/utils/orders/todaySales.constants'

export function useTodaySales(
  companyId: string | undefined,
  params: { page: number; limit?: number },
  options?: { enabled?: boolean },
) {
  const limit = params.limit ?? TODAY_SALES_PAGE_LIMIT

  return useQuery({
    queryKey: queryKeys.orders.sales(companyId || '', params.page, limit, 'today'),
    queryFn: async (): Promise<RecentSalesData> => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await ordersService.getSales(companyId, {
        page: params.page,
        limit,
        period: 'today',
      })
      return mapSalesResponseToRecentSalesData(response.data)
    },
    enabled: !!companyId && (options?.enabled ?? true),
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}
