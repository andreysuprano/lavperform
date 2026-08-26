import {
  Company,
  AgentData,
  AgentWithConfigs,
  AgentPersona,
  AgentModelConfig,
  AgentMemoryConfig,
  AgentMediaConfig,
  AgentFilterConfig,
  AgentJourneyConfig,
  AgentNotificationConfig,
  LLMModel,
  KnowledgeBase,
  IngestResult,
  McpServerData,
  CreateMcpServerPayload,
  UpdateMcpServerPayload,
  AgentRunsResponse,
  AgentRunDetail,
  AgentRunStatus,
} from './types';
import { getPublicApiUrl } from './env';

const API_URL = getPublicApiUrl();

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...options?.headers },
    ...options,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}: ${res.statusText}`;
    try {
      const body = await res.json();
      message = body.message || body.error || message;
    } catch {}
    throw new Error(message);
  }

  if (res.status === 204) return undefined as T;
  return res.json();
}

// Companies
export const api = {
  companies: {
    list: () => request<Company[]>('/companies'),
    get: (id: string) => request<Company>(`/companies/${id}`),
    create: (data: Partial<Company>) =>
      request<Company>('/companies', { method: 'POST', body: JSON.stringify(data) }),
    update: (id: string, data: Partial<Company>) =>
      request<Company>(`/companies/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    delete: (id: string) => request<void>(`/companies/${id}`, { method: 'DELETE' }),
    agents: (id: string) => request<AgentData[]>(`/companies/${id}/agents`),
  },

  agents: {
    get: (id: string) => request<AgentWithConfigs>(`/agents/${id}`),
    create: (companyId: string, data: Record<string, unknown>) =>
      request<AgentWithConfigs>(`/companies/${companyId}/agents`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    update: (id: string, data: Partial<AgentData>) =>
      request<AgentData>(`/agents/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
    toggle: (id: string) =>
      request<AgentData>(`/agents/${id}/toggle`, { method: 'PATCH' }),
    delete: (id: string) => request<void>(`/agents/${id}`, { method: 'DELETE' }),
    updatePersona: (id: string, data: Partial<AgentPersona>) =>
      request<AgentPersona>(`/agents/${id}/persona`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateModelConfig: (id: string, data: Partial<AgentModelConfig>) =>
      request<AgentModelConfig>(`/agents/${id}/model-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateMemoryConfig: (id: string, data: Partial<AgentMemoryConfig>) =>
      request<AgentMemoryConfig>(`/agents/${id}/memory-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateMediaConfig: (id: string, data: Partial<AgentMediaConfig>) =>
      request<AgentMediaConfig>(`/agents/${id}/media-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateFilterConfig: (id: string, data: Partial<AgentFilterConfig>) =>
      request<AgentFilterConfig>(`/agents/${id}/filter-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateJourneyConfig: (id: string, data: Partial<AgentJourneyConfig>) =>
      request<AgentJourneyConfig>(`/agents/${id}/journey-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    updateNotificationConfig: (
      id: string,
      data: Partial<AgentNotificationConfig>,
    ) =>
      request<AgentNotificationConfig>(`/agents/${id}/notification-config`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
  },

  llm: {
    models: () => request<LLMModel[]>('/llm/models'),
  },

  mcpServers: {
    list: (agentId: string) =>
      request<McpServerData[]>(`/agents/${agentId}/mcp-servers`),
    create: (agentId: string, data: CreateMcpServerPayload) =>
      request<McpServerData>(`/agents/${agentId}/mcp-servers`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    get: (id: string) => request<McpServerData>(`/mcp-servers/${id}`),
    update: (id: string, data: UpdateMcpServerPayload) =>
      request<McpServerData>(`/mcp-servers/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(data),
      }),
    toggle: (id: string) =>
      request<McpServerData>(`/mcp-servers/${id}/toggle`, { method: 'PATCH' }),
    delete: (id: string) => request<void>(`/mcp-servers/${id}`, { method: 'DELETE' }),
  },

  agentRuns: {
    list: (params: {
      agentId?: string;
      companyId?: string;
      conversationId?: string;
      status?: AgentRunStatus;
      page?: number;
      limit?: number;
    }) => {
      const query = new URLSearchParams();
      if (params.agentId) query.set('agentId', params.agentId);
      if (params.companyId) query.set('companyId', params.companyId);
      if (params.conversationId) query.set('conversationId', params.conversationId);
      if (params.status) query.set('status', params.status);
      if (params.page) query.set('page', String(params.page));
      if (params.limit) query.set('limit', String(params.limit));
      return request<AgentRunsResponse>(`/agent-runs?${query.toString()}`);
    },
    get: (id: string) => request<AgentRunDetail>(`/agent-runs/${id}`),
  },

  knowledgeBases: {
    list: (companyId: string) =>
      request<KnowledgeBase[]>(`/companies/${companyId}/knowledge-bases`),
    create: (companyId: string, data: { name: string; description?: string; agentId?: string | null }) =>
      request<KnowledgeBase>(`/companies/${companyId}/knowledge-bases`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    ingest: (
      companyId: string,
      kbId: string,
      data: { content: string; metadata?: Record<string, unknown> }
    ) =>
      request<IngestResult>(`/companies/${companyId}/knowledge-bases/${kbId}/ingest`, {
        method: 'POST',
        body: JSON.stringify(data),
      }),
    deleteChunk: (companyId: string, kbId: string, chunkId: string) =>
      request<void>(
        `/companies/${companyId}/knowledge-bases/${kbId}/chunks/${chunkId}`,
        { method: 'DELETE' }
      ),
  },
};
