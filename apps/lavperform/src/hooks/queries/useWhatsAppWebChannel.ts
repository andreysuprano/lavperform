import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { channelService } from '@/services'

export function useWhatsAppWebChannelStatus(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.channels.whatsappWeb.status(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await channelService.whatsappWeb.getStatus(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 30,
    refetchInterval: 1000 * 60,
  })
}

export function useWhatsAppWebChannelConnection(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.channels.whatsappWeb.connection(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      try {
        const response = await channelService.whatsappWeb.getConnection(companyId)
        return response.data
      } catch (error: any) {
        if (error?.response?.status === 404) {
          return null
        }
        throw error
      }
    },
    enabled: !!companyId,
    staleTime: 1000 * 10,
    retry: false,
  })
}

export function useConnectWhatsAppWebChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await channelService.whatsappWeb.connect(companyId)
      return response.data
    },
    onSuccess: (_data, companyId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappWeb.status(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappWeb.connection(companyId),
      })
    },
  })
}

export function useDisconnectWhatsAppWebChannel() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (companyId: string) => {
      const response = await channelService.whatsappWeb.disconnect(companyId)
      return response.data
    },
    onSuccess: (_data, companyId) => {
      queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappWeb.status(companyId),
      })
      queryClient.invalidateQueries({
        queryKey: queryKeys.channels.whatsappWeb.connection(companyId),
      })
    },
  })
}
