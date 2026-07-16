import { useQuery } from '@tanstack/react-query'

import { customerService } from '@/services'

export function useCustomerMetrics(companyId?: string) {
  return useQuery({
    queryKey: ['customer-metrics', companyId],
    queryFn: () => customerService.getCustomerMetrics(companyId!),
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5, // 5 minutos
    refetchInterval: 1000 * 60 * 10, // Refetch a cada 10 minutos
  })
}
