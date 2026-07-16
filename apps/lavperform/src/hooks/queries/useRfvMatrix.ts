import { useQuery } from '@tanstack/react-query'
import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { customerService } from '@/services'

export function useRfvMatrix(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.customers.rfvMatrix(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await customerService.getRfvMatrix(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 10,
  })
}
