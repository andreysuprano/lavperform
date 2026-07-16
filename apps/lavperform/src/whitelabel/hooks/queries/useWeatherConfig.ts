import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { getMockWeatherConfig, saveMockWeatherConfig } from '@/whitelabel/utils'
import { weatherService } from '@/whitelabel/services'
import type {
  WeatherConfigFormData,
  WeatherAlertConfigPayload,
} from '@/whitelabel/types'

/**
 * Hook para buscar configuração de Clima e Tempo
 * Por enquanto usa dados mockados (localStorage)
 * Quando o backend estiver disponível, substituir por chamada real
 */
export function useWeatherConfig() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.weather.config(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      // TODO: Quando backend estiver disponível, descomentar:
      // const response = await weatherService.getConfig(selectedCompany.id)
      // return response.data

      // Por enquanto, usa dados mockados
      return getMockWeatherConfig(selectedCompany.id)
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para atualizar configuração de Clima e Tempo
 * Por enquanto salva em localStorage (mock)
 * Quando o backend estiver disponível, substituir por chamada real
 */
export function useUpdateWeatherConfig() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<WeatherConfigFormData>) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }

      // TODO: Quando backend estiver disponível, descomentar:
      // const response = await weatherService.updateConfig(selectedCompany.id, data)
      // return response.data

      // Por enquanto, salva em localStorage (mock)
      return saveMockWeatherConfig(selectedCompany.id, data)
    },
    onSuccess: () => {
      if (selectedCompany) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.weather.config(selectedCompany.id),
        })
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração de clima e tempo atualizada com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração.',
        type: 'error',
      })
    },
  })
}

/**
 * Hook para buscar configuração de alertas de clima
 * Usa endpoint real do backend
 */
export function useWeatherAlertConfig() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.weather.alertConfig(
      selectedCompany?.id || ''
    ),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      const response = await weatherService.getWeatherAlertConfig(
        selectedCompany.id
      )
      return response.data
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}

/**
 * Hook para salvar configuração de alertas de clima
 * Usa endpoint real do backend
 */
export function useSaveWeatherAlertConfig() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: WeatherAlertConfigPayload) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      const response = await weatherService.saveWeatherAlertConfig(
        selectedCompany.id,
        data
      )
      return response.data
    },
    onSuccess: () => {
      if (selectedCompany) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.weather.alertConfig(
            selectedCompany.id
          ),
        })
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração de alertas salva com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível salvar a configuração.',
        type: 'error',
      })
    },
  })
}
