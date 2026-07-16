import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/context/AuthContext'
import { queryKeys } from '@/lib/react-query'
import { getMockAIAgentConfig } from '@/whitelabel/utils'

/**
 * Hook para buscar configuração do Agente de IA
 * Por enquanto usa dados mockados (localStorage)
 * Quando o backend estiver disponível, substituir por chamada real
 */
export function useAIAgentConfig() {
  const { selectedCompany } = useAuth()

  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.config(selectedCompany?.id || ''),
    queryFn: async () => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      
      // TODO: Quando backend estiver disponível, descomentar:
      // const response = await aiAgentService.getConfig(selectedCompany.id)
      // return response.data
      
      // Por enquanto, usa dados mockados
      return getMockAIAgentConfig(selectedCompany.id)
    },
    enabled: !!selectedCompany,
    staleTime: 1000 * 60 * 5, // 5 minutos
  })
}
