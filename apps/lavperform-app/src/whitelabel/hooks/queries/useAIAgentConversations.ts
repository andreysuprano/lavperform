import { useQuery } from '@tanstack/react-query'

import { queryKeys } from '@/lib/react-query'
import { aiAgentService } from '@/whitelabel/services'

export function useAIAgentConversations(
  companyId: string | undefined,
  agentId: string | undefined,
  {
    page = 1,
    limit = 30,
    search = '',
  }: { page?: number; limit?: number; search?: string } = {}
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.conversations(
      companyId || '',
      agentId || '',
      page,
      limit,
      search
    ),
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required')
      const response = await aiAgentService.listConversations(agentId, {
        page,
        limit,
        search: search || undefined,
      })
      return response.data
    },
    enabled: !!companyId && !!agentId,
    staleTime: 0,
    refetchOnMount: 'always',
  })
}

export function useAIAgentConversationMessages(
  companyId: string | undefined,
  agentId: string | undefined,
  conversationId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.conversationMessages(
      companyId || '',
      agentId || '',
      conversationId || ''
    ),
    queryFn: async ({ queryKey }) => {
      const currentAgentId = queryKey[4]
      const currentConversationId = queryKey[5]
      if (!currentAgentId || !currentConversationId) {
        throw new Error('Agent ID and Conversation ID are required')
      }
      const response = await aiAgentService.listConversationMessages(
        currentAgentId,
        currentConversationId
      )
      return response.data
    },
    enabled: !!companyId && !!agentId && !!conversationId,
    staleTime: 0,
    refetchOnMount: 'always',
    placeholderData: undefined,
  })
}
