import { useQueryClient } from '@tanstack/react-query'
import { useEffect, useRef } from 'react'

import { useAuth } from '@/context/AuthContext'

/**
 * Hook que detecta mudanças na empresa selecionada e invalida todas as queries
 * para forçar refetch dos dados com o novo contexto de empresa
 */
export function useCompanyChange() {
  const { selectedCompany } = useAuth()
  const queryClient = useQueryClient()
  const previousCompanyId = useRef<string | null>(selectedCompany?.id || null)

  useEffect(() => {
    // Se a empresa mudou (e não é a primeira renderização)
    if (
      selectedCompany?.id &&
      previousCompanyId.current &&
      selectedCompany.id !== previousCompanyId.current
    ) {
      // Invalida todas as queries para forçar refetch com nova empresa
      queryClient.invalidateQueries()

      // Atualiza a referência
      previousCompanyId.current = selectedCompany.id
    } else if (selectedCompany?.id && !previousCompanyId.current) {
      // Primeira renderização, apenas salva a referência
      previousCompanyId.current = selectedCompany.id
    }
  }, [selectedCompany?.id, queryClient])
}
