import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { aiAgentService } from '@/whitelabel/services'

export function useAIAgentConversations(
  agentId: string | undefined,
  { page = 1, limit = 30 }: { page?: number; limit?: number } = {}
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.conversations(
      agentId || '',
      page,
      limit
    ),
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required')
      const response = await aiAgentService.listConversations(agentId, {
        page,
        limit,
      })
      return response.data
    },
    enabled: !!agentId,
    staleTime: 1000 * 30,
  })
}

export function useAIAgentConversationMessages(
  agentId: string | undefined,
  conversationId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.conversationMessages(
      agentId || '',
      conversationId || ''
    ),
    queryFn: async () => {
      if (!agentId || !conversationId) {
        throw new Error('Agent ID and Conversation ID are required')
      }
      const response = await aiAgentService.listConversationMessages(
        agentId,
        conversationId
      )
      return response.data
    },
    enabled: !!agentId && !!conversationId,
    staleTime: 1000 * 15,
  })
}
