import { useCallback, useEffect, useState } from 'react'

import { customerService } from '@/services'
import type {
  CustomerBehavior,
  CustomerHistoryEvent,
  CustomerMessages,
  CustomerOrderSummary,
  CustomerSegment,
} from '@/types'
import { logger } from '@/utils/logger'

type CustomerDetailsData = {
  orders: CustomerOrderSummary[]
  behavior: CustomerBehavior | null
  messages: CustomerMessages | null
  history: CustomerHistoryEvent[]
  segments: CustomerSegment[]
  loading: boolean
  error: string | null
}

/**
 * Custom hook para buscar todos os dados necessários para o modal
 * Centraliza a lógica de fetching e estado para os componentes de tabs
 */
export function useCustomerDetails(
  companyId: string | undefined,
  customerId: string
): CustomerDetailsData {
  const [orders, setOrders] = useState<CustomerOrderSummary[]>([])
  const [behavior, setBehavior] = useState<CustomerBehavior | null>(null)
  const [messages, setMessages] = useState<CustomerMessages | null>(null)
  const [history, setHistory] = useState<CustomerHistoryEvent[]>([])
  const [segments, setSegments] = useState<CustomerSegment[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAllData = useCallback(async () => {
    if (!customerId || !companyId) return

    setLoading(true)
    setError(null)

    try {
      // Buscar todos os dados em juntos
      const [ordersRes, behaviorRes, messagesRes, historyRes] =
        await Promise.all([
          customerService.getCustomerOrdersSummary(customerId),
          customerService.getCustomerBehavior(companyId, customerId),
          customerService.getCustomerMessages(customerId),
          customerService.getCustomerHistory(customerId),
          // customerService.getCustomerSegments(customerId), // Comentado - método não disponível
        ])

      setOrders(ordersRes.data)
      setBehavior(behaviorRes.data)
      setMessages(messagesRes.data)
      setHistory(historyRes.data)
      setSegments([]) // Array vazio já que o método foi comentado e futuramente mudará quando o endpoint for implementado
    } catch (err) {
      logger.error('Erro ao buscar dados do cliente:', err)
      setError('Erro ao carregar dados do cliente')
    } finally {
      setLoading(false)
    }
  }, [customerId, companyId])

  useEffect(() => {
    fetchAllData()
  }, [fetchAllData])

  return {
    orders,
    behavior,
    messages,
    history,
    segments,
    loading,
    error,
  }
}
