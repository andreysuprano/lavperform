import type {
  AIAgent,
  AIAgentConversationMessage,
  AIAgentConversationsResponse,
  AIAgentKnowledgeFileResponse,
  AIAgentMcpServer,
  CreateAIAgentMcpServerPayload,
  CreateAIAgentPayload,
  CreateKnowledgeFilePayload,
  GeneratePromptStudioResult,
  ProposePromptStudioPayload,
  PromptDocument,
  PromptProposal,
  PromptStudioThread,
  QuestionnaireAnswers,
  SendPromptStudioMessagePayload,
  SendPromptStudioMessageResult,
  TestPromptStudioResult,
  UpdateAIAgentFilterConfigPayload,
  UpdateAIAgentJourneyConfigPayload,
  UpdateAIAgentMcpServerPayload,
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

  async updateAgentFilterConfig(
    agentId: string,
    data: UpdateAIAgentFilterConfigPayload
  ) {
    return await client.patch<AIAgent>(
      `/ai-agents/${agentId}/filter-config`,
      data
    )
  },

  async updateAgentJourneyConfig(
    agentId: string,
    data: UpdateAIAgentJourneyConfigPayload
  ) {
    return await client.patch<AIAgent>(
      `/ai-agents/${agentId}/journey-config`,
      data
    )
  },

  async updateAgentWebhook(companyId: string, agentId: string) {
    return await client.post<{ success: boolean; message: string }>(
      `/companies/${companyId}/ai-agents/${agentId}/webhook`
    )
  },

  // ─── MCP Servers ─────────────────────────────────────────────────────────

  async listMcpServers(agentId: string) {
    return await client.get<AIAgentMcpServer[]>(
      `/ai-agents/${agentId}/mcp-servers`
    )
  },

  async createMcpServer(agentId: string, data: CreateAIAgentMcpServerPayload) {
    return await client.post<AIAgentMcpServer>(
      `/ai-agents/${agentId}/mcp-servers`,
      data
    )
  },

  async updateMcpServer(
    mcpServerId: string,
    data: UpdateAIAgentMcpServerPayload
  ) {
    return await client.patch<AIAgentMcpServer>(
      `/mcp-servers/${mcpServerId}`,
      data
    )
  },

  async toggleMcpServer(mcpServerId: string) {
    return await client.patch<AIAgentMcpServer>(
      `/mcp-servers/${mcpServerId}/toggle`
    )
  },

  async deleteMcpServer(mcpServerId: string) {
    return await client.delete(`/mcp-servers/${mcpServerId}`)
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

  // ─── Conversas ───────────────────────────────────────────────────────────

  async listConversations(
    agentId: string,
    params: { page?: number; limit?: number; search?: string } = {}
  ) {
    return await client.get<AIAgentConversationsResponse>(
      `/ai-agents/${agentId}/conversations`,
      { params }
    )
  },

  async listConversationMessages(agentId: string, conversationId: string) {
    return await client.get<AIAgentConversationMessage[]>(
      `/ai-agents/${agentId}/conversations/${conversationId}/messages`
    )
  },

  // ─── Prompt studio ───────────────────────────────────────────────────────

  async generatePromptStudio(data: QuestionnaireAnswers, agentId?: string) {
    const path = agentId
      ? `/ai-agents/${agentId}/prompt-studio/generate`
      : '/ai-agents/prompt-studio/generate'
    return await client.post<GeneratePromptStudioResult>(path, data)
  },

  async testPromptStudio(
    data: { document: PromptDocument; question: string },
    agentId?: string
  ) {
    const path = agentId
      ? `/ai-agents/${agentId}/prompt-studio/test`
      : '/ai-agents/prompt-studio/test'
    return await client.post<TestPromptStudioResult>(path, data)
  },

  async proposePromptStudio(
    data: ProposePromptStudioPayload,
    agentId?: string
  ) {
    const path = agentId
      ? `/ai-agents/${agentId}/prompt-studio/propose`
      : '/ai-agents/prompt-studio/propose'
    return await client.post<PromptProposal>(path, data)
  },

  async getPromptStudioThread(agentId: string) {
    return await client.get<PromptStudioThread>(
      `/ai-agents/${agentId}/prompt-studio/thread`
    )
  },

  async sendPromptStudioMessage(
    agentId: string,
    data: SendPromptStudioMessagePayload
  ) {
    return await client.post<SendPromptStudioMessageResult>(
      `/ai-agents/${agentId}/prompt-studio/thread/messages`,
      data
    )
  },

  async discardPromptStudioProposal(agentId: string) {
    return await client.post(
      `/ai-agents/${agentId}/prompt-studio/thread/discard`
    )
  },
}
