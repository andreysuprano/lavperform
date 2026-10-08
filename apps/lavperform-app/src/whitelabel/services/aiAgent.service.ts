import type {
  AIAgent,
  AIAgentConversationMessage,
  AIAgentConversationsResponse,
  AIAgentKnowledgeFileResponse,
  AIAgentMcpServer,
  ConfiguratorBlock,
  ConfiguratorDecision,
  ConfiguratorTurnMessage,
  ConfiguratorTurnResult,
  CreateAIAgentMcpServerPayload,
  CreateAIAgentPayload,
  CreateKnowledgeFilePayload,
  GeneratePromptStudioPayload,
  GeneratePromptStudioResult,
  ProposePromptStudioPayload,
  PromptDocument,
  PromptProposal,
  PromptSheetResponse,
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

import { takeSseEvents } from './configurator-stream'

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

  // ─── Prompt sheet ────────────────────────────────────────────────────────

  async getPromptSheet(companyId: string, agentId?: string) {
    const path = agentId
      ? `/companies/${companyId}/ai-agents/${agentId}/prompt-sheet`
      : `/companies/${companyId}/ai-agents/prompt-sheet`
    return await client.get<PromptSheetResponse>(path)
  },

  async putPromptSheetAnswer(
    companyId: string,
    data: { key: string; value: string; sheetUpdatedAt?: string },
    agentId?: string
  ) {
    const path = agentId
      ? `/companies/${companyId}/ai-agents/${agentId}/prompt-sheet`
      : `/companies/${companyId}/ai-agents/prompt-sheet`
    return await client.put<{
      serviceModel: string
      answers: Record<string, string>
      updatedAt: string
    }>(path, data)
  },

  async assertPromptSheetFresh(
    companyId: string,
    sheetUpdatedAt: string,
    agentId?: string
  ) {
    const path = agentId
      ? `/companies/${companyId}/ai-agents/${agentId}/prompt-sheet/assert-fresh`
      : `/companies/${companyId}/ai-agents/prompt-sheet/assert-fresh`
    return await client.post(path, { sheetUpdatedAt })
  },

  async adoptPromptSheet(companyId: string, agentId: string) {
    return await client.post(
      `/companies/${companyId}/ai-agents/${agentId}/prompt-sheet/adopt`
    )
  },

  // ─── Prompt studio ───────────────────────────────────────────────────────

  async generatePromptStudio(
    data: GeneratePromptStudioPayload,
    agentId?: string
  ) {
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
    companyId: string,
    data: ProposePromptStudioPayload,
    agentId?: string
  ) {
    const path = agentId
      ? `/companies/${companyId}/ai-agents/${agentId}/prompt-studio/propose`
      : `/companies/${companyId}/ai-agents/prompt-studio/propose`
    return await client.post<PromptProposal>(path, data)
  },

  async discardPromptStudioProposal(agentId: string) {
    return await client.post(
      `/ai-agents/${agentId}/prompt-studio/thread/discard`
    )
  },

  async putPromptSheetIntro(
    companyId: string,
    data: {
      agentName?: string
      agentObjective?: string
      serviceModel?: 'CONVENTIONAL' | 'SELF_SERVICE'
      sheetUpdatedAt?: string
    }
  ) {
    return await client.put<PromptSheetResponse>(
      `/companies/${companyId}/ai-agents/prompt-sheet/intro`,
      data
    )
  },

  async finishWizard(companyId: string) {
    return await client.post<{ id: string }>(
      `/companies/${companyId}/ai-agents/from-wizard`
    )
  },

  async listConfiguratorTurns(companyId: string, agentId: string) {
    return await client.get<ConfiguratorTurnMessage[]>(
      `/companies/${companyId}/ai-agents/${agentId}/configurator/turns`
    )
  },

  async sendConfiguratorTurn(companyId: string, agentId: string, text: string) {
    return await client.post<ConfiguratorTurnResult>(
      `/companies/${companyId}/ai-agents/${agentId}/configurator/turns`,
      { text }
    )
  },

  async streamConfiguratorTurn(
    companyId: string,
    agentId: string,
    text: string,
    handlers: {
      signal?: AbortSignal
      onActivity: (event: { id: string; label: string; status: 'running' | 'done' }) => void
      onDone: (blocks: ConfiguratorBlock[]) => void
      onError: (message: string) => void
    }
  ) {
    const token = localStorage.getItem('@FoodCRM:token')
    const baseURL = String(import.meta.env.VITE_API_URL || 'https://api.foodcrm.com.br').replace(/\/$/, '')
    const response = await fetch(
      `${baseURL}/companies/${companyId}/ai-agents/${agentId}/configurator/turns/stream`,
      {
        method: 'POST',
        signal: handlers.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ text }),
      }
    )
    if (!response.ok || !response.body) {
      const data = (await response.json().catch(() => null)) as { message?: string } | null
      throw new Error(data?.message || 'A resposta falhou.')
    }

    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ''
    let finished = false
    const handle = (event: unknown) => {
      if (!event || typeof event !== 'object') return
      const row = event as {
        type?: string
        id?: string
        label?: string
        status?: string
        message?: string
        blocks?: ConfiguratorBlock[]
      }
      if (
        row.type === 'activity' &&
        row.id &&
        row.label &&
        (row.status === 'running' || row.status === 'done')
      ) {
        handlers.onActivity({ id: row.id, label: row.label, status: row.status })
        return
      }
      if (row.type === 'done' && Array.isArray(row.blocks)) {
        finished = true
        handlers.onDone(row.blocks)
        return
      }
      if (row.type === 'error') {
        finished = true
        handlers.onError(row.message || 'A resposta falhou.')
      }
    }

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const parsed = takeSseEvents(buffer)
      buffer = parsed.rest
      parsed.events.forEach(handle)
    }
    if (buffer.trim()) {
      const parsed = takeSseEvents(`${buffer}\n\n`)
      parsed.events.forEach(handle)
    }
    if (!finished) handlers.onError('A resposta falhou.')
  },

  async acceptConfiguratorProposal(
    companyId: string,
    agentId: string,
    messageId: string
  ) {
    return await client.post<ConfiguratorDecision>(
      `/companies/${companyId}/ai-agents/${agentId}/configurator/proposals/${messageId}/accept`
    )
  },

  async rejectConfiguratorProposal(
    companyId: string,
    agentId: string,
    messageId: string
  ) {
    return await client.post<ConfiguratorDecision>(
      `/companies/${companyId}/ai-agents/${agentId}/configurator/proposals/${messageId}/reject`
    )
  },
}
