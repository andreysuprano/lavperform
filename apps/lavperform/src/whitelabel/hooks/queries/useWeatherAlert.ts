import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { weatherService } from '@/whitelabel/services'
import type { WeatherAlertConfig } from '@/whitelabel/types'

/**
 * Hook para ativar/desativar alertas de clima
 * Mutation que chama o endpoint real do backend
 */
export function useToggleWeatherAlert() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (active: boolean) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      const response = await weatherService.toggleWeatherAlert(
        selectedCompany.id,
        active
      )
      return response.data
    },
    onMutate: async (active: boolean) => {
      if (!selectedCompany) return

      const alertConfigKey = queryKeys.whitelabel.weather.alertConfig(
        selectedCompany.id
      )

      await queryClient.cancelQueries({ queryKey: alertConfigKey })

      const previousConfig =
        queryClient.getQueryData<WeatherAlertConfig>(alertConfigKey)

      queryClient.setQueryData<WeatherAlertConfig>(alertConfigKey, (old) =>
        old ? { ...old, active } : old
      )

      return { previousConfig }
    },
    onError: (_err, _active, context) => {
      if (selectedCompany && context?.previousConfig) {
        queryClient.setQueryData(
          queryKeys.whitelabel.weather.alertConfig(selectedCompany.id),
          context.previousConfig
        )
      }
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração de alertas.',
        type: 'error',
      })
    },
    onSuccess: () => {
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração de alertas atualizada com sucesso!',
        type: 'success',
      })
    },
    onSettled: () => {
      if (selectedCompany) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.weather.alertConfig(selectedCompany.id),
        })
      }
    },
  })
}

/**
 * Hook para buscar o histórico de alertas enviados
 * Query que chama o endpoint real do backend
 */
export function useWeatherHistory() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.weather.history(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      const response = await weatherService.getAlertHistory(selectedCompany.id)
      return response.data
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 2, // 2 minutos
    retry: 2, // 2 tentativas em caso de falha
  })
}
