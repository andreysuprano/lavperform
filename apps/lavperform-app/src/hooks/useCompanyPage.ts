import { useContext } from 'react'

import { CompanyPageContext } from '@/context/CompanyPageContext'

export function useCompanyPage() {
  const context = useContext(CompanyPageContext)

  if (!context) {
    throw new Error('useCompanyPage must be used within a CompanyPageProvider')
  }
  return context
}
