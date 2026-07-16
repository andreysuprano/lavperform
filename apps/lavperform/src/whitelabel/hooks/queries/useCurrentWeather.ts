import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { weatherService } from '@/whitelabel/services'

export function useCurrentWeather() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.weather.current(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      const response = await weatherService.getCurrentWeather(selectedCompany.id)
      return response.data
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 30, // 30 minutos
    retry: 2, // 2 tentativas em caso de falha temporária
    retryDelay: 1000, // 1 segundo entre tentativas
  })
}
