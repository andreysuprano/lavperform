import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { saveMockAIAgentConfig } from '@/whitelabel/utils'
import type { AIAgentConfigFormData } from '@/whitelabel/types'

/**
 * Hook para atualizar configuração do Agente de IA
 * Por enquanto salva em localStorage (mock)
 * Quando o backend estiver disponível, substituir por chamada real
 */
export function useUpdateAIAgentConfig() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (data: Partial<AIAgentConfigFormData>) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      
      // TODO: Quando backend estiver disponível, descomentar:
      // const response = await aiAgentService.updateConfig(selectedCompany.id, data)
      // return response.data
      
      // Por enquanto, salva em localStorage (mock)
      return saveMockAIAgentConfig(selectedCompany.id, data)
    },
    onSuccess: () => {
      if (selectedCompany) {
        queryClient.invalidateQueries({
          queryKey: queryKeys.whitelabel.aiAgent.config(selectedCompany.id),
        })
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração do agente de IA atualizada com sucesso!',
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
