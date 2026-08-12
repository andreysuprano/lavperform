import { useMutation, useQuery } from '@tanstack/react-query'

import { queryKeys, invalidateQueries } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { aiAgentService } from '@/whitelabel/services'
import type {
  CreateAIAgentMcpServerPayload,
  UpdateAIAgentMcpServerPayload,
} from '@/whitelabel/types'

export function useAIAgentMcpServers(agentId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.mcpServers(agentId || ''),
    queryFn: async () => {
      if (!agentId) throw new Error('Agent ID is required')
      const response = await aiAgentService.listMcpServers(agentId)
      return response.data
    },
    enabled: !!agentId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAIAgentMcpServer() {
  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string
      data: CreateAIAgentMcpServerPayload
    }) => {
      const response = await aiAgentService.createMcpServer(agentId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentMcpServers(variables.agentId)
      toaster.create({
        title: 'Servidor MCP criado',
        description: 'O servidor MCP foi adicionado com sucesso.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível criar o servidor MCP. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useUpdateAIAgentMcpServer() {
  return useMutation({
    mutationFn: async ({
      agentId: _agentId,
      mcpServerId,
      data,
    }: {
      agentId: string
      mcpServerId: string
      data: UpdateAIAgentMcpServerPayload
    }) => {
      const response = await aiAgentService.updateMcpServer(mcpServerId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentMcpServers(variables.agentId)
      toaster.create({
        title: 'Servidor MCP atualizado',
        description: 'As alterações foram salvas com sucesso.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description:
          'Não foi possível atualizar o servidor MCP. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useToggleAIAgentMcpServer() {
  return useMutation({
    mutationFn: async ({
      agentId: _agentId,
      mcpServerId,
    }: {
      agentId: string
      mcpServerId: string
    }) => {
      const response = await aiAgentService.toggleMcpServer(mcpServerId)
      return response.data
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentMcpServers(variables.agentId)
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description:
          'Não foi possível alterar o status do servidor MCP. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useDeleteAIAgentMcpServer() {
  return useMutation({
    mutationFn: async ({
      agentId: _agentId,
      mcpServerId,
    }: {
      agentId: string
      mcpServerId: string
    }) => {
      await aiAgentService.deleteMcpServer(mcpServerId)
    },
    onSuccess: (_data, variables) => {
      invalidateQueries.aiAgentMcpServers(variables.agentId)
      toaster.create({
        title: 'Servidor MCP removido',
        description: 'O servidor MCP foi removido com sucesso.',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível remover o servidor MCP. Tente novamente.',
        type: 'error',
      })
    },
  })
}
