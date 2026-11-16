import { type ReactNode, useEffect, useRef } from 'react'
import { Navigate } from 'react-router-dom'

import { useAuth } from '@/context/AuthContext'

/**
 * Telas com um agente na URL só valem para a empresa em que foram abertas.
 * Se outra empresa for selecionada, volta para a lista de agentes em vez de
 * continuar editando o agente da empresa anterior.
 */
export function AgentCompanyBoundary({ children }: { children: ReactNode }) {
  const { selectedCompany } = useAuth()
  const companyId = selectedCompany?.id ?? null
  const openedWith = useRef<string | null>(companyId)

  useEffect(() => {
    if (openedWith.current === null) openedWith.current = companyId
  }, [companyId])

  const companyChanged =
    openedWith.current !== null && companyId !== null && companyId !== openedWith.current

  if (companyChanged) {
    return <Navigate replace to="/whitelabel/ai-agent" />
  }

  return <>{children}</>
}
