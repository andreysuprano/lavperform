import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { ordersService } from '@/services'
import type { DashboardPerformanceData } from '@/types'
import { mapMonthlySalesToPerformance } from '@/utils/orders/mapDashboardPerformance'

export function useDashboardPerformance(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.orders.monthlySales(companyId || ''),
    queryFn: async (): Promise<DashboardPerformanceData> => {
      if (!companyId) throw new Error('Company ID is required')

      const response = await ordersService.getMonthlySales(companyId)

      return mapMonthlySalesToPerformance(response.data)
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 3,
    placeholderData: (previousData) => previousData,
  })
}
