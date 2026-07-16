import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { whatsappService } from '@/services'

/**
 * Hook para buscar status da instância WhatsApp
 */
export function useWhatsAppStatus(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.whatsapp.status(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await whatsappService.checkInstanceStatus(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 30, // 30 segundos
    refetchInterval: 1000 * 60, // Refaz a cada 1 minuto
  })
}

/**
 * Hook para buscar conexão/QR Code da instância
 */
export function useWhatsAppConnection(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.whatsapp.connection(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      try {
        const response = await whatsappService.getInstanceConnection(companyId)
        return response.data
      } catch (error: any) {
        // Se retornar 404, significa que não tem conexão ainda
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 10, // 10 segundos
    retry: false, // Não faz retry automático
  })
}

/**
 * Hook para criar instância WhatsApp
 */
export function useCreateWhatsAppInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await whatsappService.createInstance(companyId)
      return response.data
    },
    onSuccess: (_data, companyId) => {
      // Invalida status da conexão
      queryClient.invalidateQueries({
        queryKey: queryKeys.whatsapp.status(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.whatsapp.connection(companyId),
      })
    },
  })
}

/**
 * Hook para deletar instância WhatsApp
 */
export function useDeleteWhatsAppInstance() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await whatsappService.deleteInstance(companyId)
      return response.data
    },
    onSuccess: (_data, companyId) => {
      // Invalida status da conexão
      queryClient.invalidateQueries({
        queryKey: queryKeys.whatsapp.status(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.whatsapp.connection(companyId),
      })
    },
  })
}
