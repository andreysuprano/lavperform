import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import {
  useCreateWhatsAppInstance,
  useDeleteWhatsAppInstance,
  useWhatsAppConnection,
  useWhatsAppStatus,
} from '@/hooks/queries/useWhatsApp'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook principal para gerenciar toda a lógica de conexão do WhatsApp
 * Centraliza o estado e ações relacionadas ao WhatsApp
 */
export const useWhatsAppManager = (companyId: string | undefined) => {
  const queryClient = useQueryClient()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  // Queries
  const { data: status, isLoading: isLoadingStatus } =
    useWhatsAppStatus(companyId)
  const { data: connection, isLoading: isLoadingConnection } =
    useWhatsAppConnection(companyId)

  // Mutations
  const createInstance = useCreateWhatsAppInstance()
  const deleteInstance = useDeleteWhatsAppInstance()

  // Estados derivados
  const isConnected = status?.status === 'CONNECTED'
  const isPending = status?.status === 'PENDING'
  const isLoading =
    isLoadingStatus ||
    isLoadingConnection ||
    createInstance.isPending ||
    deleteInstance.isPending

  /**
   * Conecta uma nova instância do WhatsApp
   */
  const connect = useCallback(async () => {
    if (!companyId) return null

    try {
      const result = await createInstance.mutateAsync(companyId)
      return result
    } catch (error) {
      console.error('Erro ao conectar WhatsApp:', error)
      return null
    }
  }, [companyId, createInstance])

  /**
   * Desconecta a instância do WhatsApp
   */
  const disconnect = useCallback(async () => {
    if (!companyId) return false

    try {
      await deleteInstance.mutateAsync(companyId)
      return true
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp:', error)
      return false
    }
  }, [companyId, deleteInstance])

  /**
   * Força atualização do status
   */
  const refreshStatus = useCallback(() => {
    if (!companyId) return

    queryClient.invalidateQueries({
      queryKey: queryKeys.whatsapp.status(companyId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.whatsapp.connection(companyId),
    })
  }, [companyId, queryClient])

  /**
   * Inicia polling quando está pendente (aguardando QR code)
   */
  useEffect(() => {
    if (isPending && companyId) {
      // Polling a cada 5 segundos quando está pendente
      pollingIntervalRef.current = setInterval(() => {
        refreshStatus()
      }, 5000)
    }

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current)
        pollingIntervalRef.current = null
      }
    }
  }, [isPending, companyId, refreshStatus])

  return {
    // Estados
    status,
    connection,
    isConnected,
    isPending,
    isLoading,

    // Ações
    connect,
    disconnect,
    refreshStatus,

    // Erros
    connectError: createInstance.error,
    disconnectError: deleteInstance.error,
  }
}
