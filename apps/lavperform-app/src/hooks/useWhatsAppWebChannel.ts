import { useQueryClient } from '@tanstack/react-query'
import { useCallback, useEffect, useRef } from 'react'

import {
  useConnectWhatsAppWebChannel,
  useDisconnectWhatsAppWebChannel,
  useWhatsAppWebChannelConnection,
  useWhatsAppWebChannelStatus,
} from '@/hooks/queries/useWhatsAppWebChannel'
import { queryKeys } from '@/lib/react-query'

/**
 * Hook principal para gerenciar toda a lógica de conexão do canal WhatsApp Web
 * Centraliza o estado e ações do canal dentro do domínio Channels
 */
export const useWhatsAppWebChannel = (companyId: string | undefined) => {
  const queryClient = useQueryClient()
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null)

  const { data: status, isLoading: isLoadingStatus } =
    useWhatsAppWebChannelStatus(companyId)
  const { data: connection, isLoading: isLoadingConnection } =
    useWhatsAppWebChannelConnection(companyId)

  const connectMutation = useConnectWhatsAppWebChannel()
  const disconnectMutation = useDisconnectWhatsAppWebChannel()

  const isConnected = status?.status === 'CONNECTED'
  const isPending = status?.status === 'PENDING'
  const isLoading =
    isLoadingStatus ||
    isLoadingConnection ||
    connectMutation.isPending ||
    disconnectMutation.isPending

  const connect = useCallback(async () => {
    if (!companyId) return null

    try {
      const result = await connectMutation.mutateAsync(companyId)
      return result
    } catch (error) {
      console.error('Erro ao conectar WhatsApp Web:', error)
      return null
    }
  }, [companyId, connectMutation])

  const disconnect = useCallback(async () => {
    if (!companyId) return false

    try {
      await disconnectMutation.mutateAsync(companyId)
      return true
    } catch (error) {
      console.error('Erro ao desconectar WhatsApp Web:', error)
      return false
    }
  }, [companyId, disconnectMutation])

  const refreshStatus = useCallback(() => {
    if (!companyId) return

    queryClient.invalidateQueries({
      queryKey: queryKeys.channels.whatsappWeb.status(companyId),
    })
    queryClient.invalidateQueries({
      queryKey: queryKeys.channels.whatsappWeb.connection(companyId),
    })
  }, [companyId, queryClient])

  useEffect(() => {
    if (isPending && companyId) {
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
    status,
    connection,
    isConnected,
    isPending,
    isLoading,
    connect,
    disconnect,
    refreshStatus,
    connectError: connectMutation.error,
    disconnectError: disconnectMutation.error,
  }
}
