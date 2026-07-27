import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { toaster } from '@/components/ui/toaster'
import { queryKeys } from '@/lib/react-query'
import { renitencyService } from '@/services'
import type { UpdateRenitencyConfigurationPayload } from '@/types'

type UseRenitencySettingsParams = {
  companyId?: string
}

export function useRenitencySettings({ companyId }: UseRenitencySettingsParams) {
  return useQuery({
    queryKey: queryKeys.company.renitency(companyId ?? ''),
    queryFn: async () => {
      if (!companyId) {
        throw new Error('Company ID is required to load renitency settings')
      }

      const response = await renitencyService.getConfiguration(companyId)
      return response.data
    },
    enabled: !!companyId,
  })
}

type UseUpdateRenitencySettingsParams = {
  companyId: string
}

export function useUpdateRenitencySettings({
  companyId,
}: UseUpdateRenitencySettingsParams) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: UpdateRenitencyConfigurationPayload) => {
      const response = await renitencyService.updateConfiguration(
        companyId,
        payload
      )
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.company.renitency(companyId),
      })
      toaster.create({
        title: 'Configurações salvas com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro ao salvar configurações',
        description: 'Verifique sua conexão e tente novamente.',
        type: 'error',
      })
    },
  })
}
