import type {
  AIAgent,
  AIAgentKnowledgeFileResponse,
  CreateAIAgentPayload,
  CreateKnowledgeFilePayload,
  UpdateAIAgentMediaConfigPayload,
  UpdateAIAgentNotificationConfigPayload,
  UpdateAIAgentPayload,
  UpdateAIAgentPersonaPayload,
  UpdateKnowledgeFilePayload,
} from '@/whitelabel/types'

import { client } from '@/services/client'

export const aiAgentService = {
  async listAgents(companyId: string) {
    return await client.get<AIAgent[]>(`/companies/${companyId}/ai-agents`)
  },

  async getAgent(agentId: string) {
    return await client.get<AIAgent>(`/ai-agents/${agentId}`)
  },

  async createAgent(companyId: string, data: CreateAIAgentPayload) {
    return await client.post<AIAgent>(
      `/companies/${companyId}/ai-agents`,
      data
    )
  },

  async updateAgent(
    companyId: string,
    agentId: string,
    data: UpdateAIAgentPayload
  ) {
    return await client.put<AIAgent>(
      `/companies/${companyId}/ai-agents/${agentId}`,
      data
    )
  },

  async deleteAgent(agentId: string) {
    return await client.delete(`/ai-agents/${agentId}`)
  },

  async toggleAgent(agentId: string) {
    return await client.patch<AIAgent>(`/ai-agents/${agentId}/toggle`)
  },

  async updateAgentPersona(agentId: string, data: UpdateAIAgentPersonaPayload) {
    return await client.patch<AIAgent>(`/ai-agents/${agentId}/persona`, data)
  },

  async updateAgentMediaConfig(
    agentId: string,
    data: UpdateAIAgentMediaConfigPayload
  ) {
    return await client.patch<AIAgent>(
      `/ai-agents/${agentId}/media-config`,
      data
    )
  },

  async updateAgentNotificationConfig(
    agentId: string,
    data: UpdateAIAgentNotificationConfigPayload
  ) {
    return await client.patch<AIAgent>(
      `/ai-agents/${agentId}/notification-config`,
      data
    )
  },

  async listKnowledgeFiles(companyId: string, agentId: string) {
    return await client.get<AIAgentKnowledgeFileResponse[]>(
      `/companies/${companyId}/ai-agents/${agentId}/knowledge-files`
    )
  },

  async createKnowledgeFile(
    companyId: string,
    agentId: string,
    data: CreateKnowledgeFilePayload
  ) {
    return await client.post<AIAgentKnowledgeFileResponse>(
      `/companies/${companyId}/ai-agents/${agentId}/knowledge-files`,
      data
    )
  },

  async updateKnowledgeFile(
    companyId: string,
    agentId: string,
    fileId: string,
    data: UpdateKnowledgeFilePayload
  ) {
    return await client.put<AIAgentKnowledgeFileResponse>(
      `/companies/${companyId}/ai-agents/${agentId}/knowledge-files/${fileId}`,
      data
    )
  },

  async deleteKnowledgeFile(
    companyId: string,
    agentId: string,
    fileId: string
  ) {
    return await client.delete(
      `/companies/${companyId}/ai-agents/${agentId}/knowledge-files/${fileId}`
    )
  },
}
