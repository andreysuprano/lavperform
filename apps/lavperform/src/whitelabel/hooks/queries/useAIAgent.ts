import { useMutation, useQuery } from '@tanstack/react-query'

import { useAuth } from '@/context/AuthContext'
import { queryKeys, invalidateQueries } from '@/lib/react-query'
import { toaster } from '@/components/ui/toaster'
import { aiAgentService } from '@/whitelabel/services'
import type {
  CreateAIAgentPayload,
  UpdateAIAgentPayload,
  UpdateAIAgentPersonaPayload,
  UpdateAIAgentMediaConfigPayload,
} from '@/whitelabel/types'

export function useAIAgents(companyId: string | undefined) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.list(companyId || ''),
    queryFn: async () => {
      if (!companyId) throw new Error('Company ID is required')
      const response = await aiAgentService.listAgents(companyId)
      return response.data
    },
    enabled: !!companyId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useAIAgent(
  companyId: string | undefined,
  agentId: string | undefined
) {
  return useQuery({
    queryKey: queryKeys.whitelabel.aiAgent.detail(
      companyId || '',
      agentId || ''
    ),
    queryFn: async () => {
      if (!agentId) {
        throw new Error('Agent ID is required')
      }
      const response = await aiAgentService.getAgent(agentId)
      return response.data
    },
    enabled: !!agentId,
    staleTime: 1000 * 60 * 5,
  })
}

export function useCreateAIAgent() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async (data: CreateAIAgentPayload) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      const response = await aiAgentService.createAgent(
        selectedCompany.id,
        data
      )
      return response.data
    },
    onSuccess: () => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
      }

      toaster.create({
        title: 'Sucesso',
        description: 'Agente de IA criado com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível criar o agente de IA. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useUpdateAIAgent() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string
      data: UpdateAIAgentPayload
    }) => {
      if (!selectedCompany) {
        throw new Error('Company ID is required')
      }
      const response = await aiAgentService.updateAgent(
        selectedCompany.id,
        agentId,
        data
      )
      return response.data
    },
    onSuccess: (_data, variables) => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
        invalidateQueries.aiAgentDetail(selectedCompany.id, variables.agentId)
      }

      toaster.create({
        title: 'Sucesso',
        description: 'Agente de IA atualizado com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description:
          'Não foi possível atualizar o agente de IA. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useDeleteAIAgent() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async (agentId: string) => {
      await aiAgentService.deleteAgent(agentId)
    },
    onSuccess: () => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
      }

      toaster.create({
        title: 'Sucesso',
        description: 'Agente de IA excluído com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível excluir o agente de IA. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useToggleAIAgent() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async (agentId: string) => {
      const response = await aiAgentService.toggleAgent(agentId)
      return response.data
    },
    onSuccess: () => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
      }

      toaster.create({
        title: 'Sucesso',
        description: 'Status do agente atualizado!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível alterar o status do agente. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useUpdateAIAgentPersona() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string
      data: UpdateAIAgentPersonaPayload
    }) => {
      const response = await aiAgentService.updateAgentPersona(agentId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
        invalidateQueries.aiAgentDetail(selectedCompany.id, variables.agentId)
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Persona do agente atualizada com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível atualizar a persona do agente. Tente novamente.',
        type: 'error',
      })
    },
  })
}

export function useUpdateAIAgentMediaConfig() {
  const { selectedCompany } = useAuth()

  return useMutation({
    mutationFn: async ({
      agentId,
      data,
    }: {
      agentId: string
      data: UpdateAIAgentMediaConfigPayload
    }) => {
      const response = await aiAgentService.updateAgentMediaConfig(agentId, data)
      return response.data
    },
    onSuccess: (_data, variables) => {
      if (selectedCompany) {
        invalidateQueries.aiAgentsList(selectedCompany.id)
        invalidateQueries.aiAgentDetail(selectedCompany.id, variables.agentId)
      }
      toaster.create({
        title: 'Sucesso',
        description: 'Configuração de mídia atualizada com sucesso!',
        type: 'success',
      })
    },
    onError: () => {
      toaster.create({
        title: 'Erro',
        description: 'Não foi possível atualizar a configuração de mídia. Tente novamente.',
        type: 'error',
      })
    },
  })
}
