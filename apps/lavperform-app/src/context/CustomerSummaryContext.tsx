import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'

import { useAuth } from '@/context/AuthContext'
import { customerService } from '@/services'
import { logger } from '@/utils/logger'

interface CustomerSummaryItem {
  segmentation: string
  count: number
  label: string
  icon: string
}

interface CustomerSummaryContextData {
  customersSummary: CustomerSummaryItem[]
  isLoading: boolean
  error: Error | null
  refetch: () => Promise<void>
}

interface CustomerSummaryProviderProps {
  children: ReactNode
}

const CustomerSummaryContext = createContext({} as CustomerSummaryContextData)

export function CustomerSummaryProvider({
  children,
}: CustomerSummaryProviderProps) {
  const { selectedCompany } = useAuth()
  const [customersSummary, setCustomersSummary] = useState<
    CustomerSummaryItem[]
  >([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchCustomersSummary = useCallback(async () => {
    if (!selectedCompany?.id) {
      setCustomersSummary([])
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const response = await customerService.listCustomersSummary(
        selectedCompany.id
      )
      setCustomersSummary(response.data)
    } catch (err) {
      logger.error('Erro ao buscar resumo de clientes:', err)
      setError(err as Error)
    } finally {
      setIsLoading(false)
    }
  }, [selectedCompany?.id])

  useEffect(() => {
    fetchCustomersSummary()
  }, [fetchCustomersSummary])

  return (
    <CustomerSummaryContext.Provider
      value={{
        customersSummary,
        isLoading,
        error,
        refetch: fetchCustomersSummary,
      }}
    >
      {children}
    </CustomerSummaryContext.Provider>
  )
}

export function useCustomerSummary() {
  const context = useContext(CustomerSummaryContext)
  if (!context) {
    throw new Error(
      'useCustomerSummary must be used within a CustomerSummaryProvider'
    )
  }
  return context
}
