import {
  BadGatewayException,
  BadRequestException,
  ConflictException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';
import type { IncomingMessage } from 'http';
import type { Response } from 'express';

const CUSTOMER_TURN_TIMEOUT_MS = 180_000;
const CUSTOMER_TURN_FALLBACK =
  'Desculpe, não consegui concluir agora. Pode enviar sua mensagem de novo?';

@Injectable()
export class LavaiAgentApiService {
  private readonly logger = new Logger(LavaiAgentApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl =
      this.configService.get<string>('LAVAI_AGENT_BASE_URL') ??
      this.configService.get<string>('OVER_AGENT_BASE_URL', 'http://lavai-agent:3000');
  }

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete' | 'put',
    path: string,
    data?: unknown,
    options?: { preserve502?: boolean; timeout?: number; customerMessage?: string },
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    const config = options?.timeout ? { timeout: options.timeout } : undefined;
    try {
      const response = await firstValueFrom(this.dispatch<T>(method, url, data, config));
      return response.data as T;
    } catch (err) {
      this.handleHttpError(err, path, options);
    }
  }

  private dispatch<T>(
    method: 'get' | 'post' | 'patch' | 'delete' | 'put',
    url: string,
    data?: unknown,
    config?: { timeout: number },
  ) {
    if (method === 'get') {
      return config ? this.httpService.get<T>(url, config) : this.httpService.get<T>(url);
    }
    if (method === 'delete') {
      return config ? this.httpService.delete<T>(url, config) : this.httpService.delete<T>(url);
    }
    if (method === 'patch') {
      return config
        ? this.httpService.patch<T>(url, data, config)
        : this.httpService.patch<T>(url, data);
    }
    if (method === 'put') {
      return config ? this.httpService.put<T>(url, data, config) : this.httpService.put<T>(url, data);
    }
    return config ? this.httpService.post<T>(url, data, config) : this.httpService.post<T>(url, data);
  }

  private handleHttpError(
    err: unknown,
    path: string,
    options?: { preserve502?: boolean; customerMessage?: string },
  ): never {
    const axiosError = err as AxiosError<{ message?: string | string[]; error?: string }>;
    const status = axiosError.response?.status;
    const responseData: unknown = axiosError.response?.data;
    const url = `${this.baseUrl}${path}`;

    let detail: string;

    if (!axiosError.response) {
      detail = `sem resposta HTTP (${axiosError.code ?? 'NETWORK_ERROR'}): ${axiosError.message}`;
    } else if (typeof responseData === 'string') {
      detail =
        responseData.includes('<html')
          ? `resposta HTML (provavelmente proxy/serviço fora do ar) — status ${status}`
          : responseData.slice(0, 300);
    } else if (responseData && typeof responseData === 'object') {
      const body = responseData as { message?: string | string[]; error?: string };
      const message = Array.isArray(body.message)
        ? body.message.join('; ')
        : body.message;
      detail = message ?? body.error ?? 'Erro ao comunicar com LavAI Agent';
    } else {
      detail = 'Erro ao comunicar com LavAI Agent';
    }

    if ((status === 502 || status === 503 || status === 504) && !options?.preserve502) {
      detail = `LavAI Agent indisponível (HTTP ${status}). Verifique se o container está rodando no Easypanel.`;
    }

    this.logger.error(`lavai-agent error [${status ?? 'NO_RESPONSE'}] ${url}: ${detail}`);

    if (
      options?.customerMessage &&
      (status === undefined || status === 408 || status === 429 || status >= 500)
    ) {
      throw new BadGatewayException(options.customerMessage);
    }

    if (status === 404) throw new NotFoundException(detail);
    if (status === 409) throw new ConflictException(detail);
    if (status === 400) throw new BadRequestException(detail);
    if (options?.preserve502 && status === 502) throw new BadGatewayException(detail);

    throw new InternalServerErrorException(
      `Falha na integração com LavAI Agent (${status ?? 'sem resposta'}): ${detail}`,
    );
  }

  async createCompany(dto: {
    name: string;
    slug: string;
    email?: string;
    phone?: string;
  }) {
    return this.request<Record<string, unknown>>('post', '/companies', dto);
  }

  async getCompany(overAgentCompanyId: string) {
    return this.request<Record<string, unknown>>('get', `/companies/${overAgentCompanyId}`);
  }

  async createAgent(overAgentCompanyId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(
      'post',
      `/companies/${overAgentCompanyId}/agents`,
      dto,
    );
  }

  async listAgents(overAgentCompanyId: string) {
    return this.request<Record<string, unknown>[]>(
      'get',
      `/companies/${overAgentCompanyId}/agents`,
    );
  }

  async getAgent(agentId: string) {
    return this.request<Record<string, unknown>>('get', `/agents/${agentId}`);
  }

  async updateAgent(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}`, dto);
  }

  async toggleAgent(agentId: string) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/toggle`);
  }

  async deleteAgent(agentId: string) {
    return this.request<void>('delete', `/agents/${agentId}`);
  }

  async updatePersona(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/persona`, dto);
  }

  async updateModelConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/model-config`, dto);
  }

  async updateMemoryConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/memory-config`, dto);
  }

  async updateMediaConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/media-config`, dto);
  }

  async updateFilterConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/agents/${agentId}/filter-config`, dto);
  }

  async updateNotificationConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(
      'patch',
      `/agents/${agentId}/notification-config`,
      dto,
    );
  }

  async updateJourneyConfig(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(
      'patch',
      `/agents/${agentId}/journey-config`,
      dto,
    );
  }

  async createMcpServer(agentId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>(
      'post',
      `/agents/${agentId}/mcp-servers`,
      dto,
    );
  }

  async listMcpServers(agentId: string) {
    return this.request<Record<string, unknown>[]>('get', `/agents/${agentId}/mcp-servers`);
  }

  async getMcpServer(mcpServerId: string) {
    return this.request<Record<string, unknown>>('get', `/mcp-servers/${mcpServerId}`);
  }

  async updateMcpServer(mcpServerId: string, dto: Record<string, unknown>) {
    return this.request<Record<string, unknown>>('patch', `/mcp-servers/${mcpServerId}`, dto);
  }

  async toggleMcpServer(mcpServerId: string) {
    return this.request<Record<string, unknown>>('patch', `/mcp-servers/${mcpServerId}/toggle`);
  }

  async deleteMcpServer(mcpServerId: string) {
    return this.request<void>('delete', `/mcp-servers/${mcpServerId}`);
  }

  async listLlmModels() {
    return this.request<Record<string, unknown>[]>('get', '/llm/models');
  }

  async listConversations(
    agentId: string,
    query: { page?: number; limit?: number; search?: string } = {},
  ) {
    const params = new URLSearchParams();
    if (query.page) params.set('page', String(query.page));
    if (query.limit) params.set('limit', String(query.limit));
    if (query.search) params.set('search', query.search);
    const qs = params.toString();
    return this.request<Record<string, unknown>>(
      'get',
      `/agents/${agentId}/conversations${qs ? `?${qs}` : ''}`,
    );
  }

  async listConversationMessages(agentId: string, conversationId: string) {
    return this.request<Record<string, unknown>[]>(
      'get',
      `/agents/${agentId}/conversations/${conversationId}/messages`,
    );
  }

  async listKnowledgeBases(overAgentCompanyId: string) {
    return this.request<
      Array<{
        id: string;
        companyId: string;
        agentId: string | null;
        name: string;
        description: string | null;
        active: boolean;
        createdAt: string;
        updatedAt: string;
      }>
    >('get', `/companies/${overAgentCompanyId}/knowledge-bases`);
  }

  async createKnowledgeBase(
    overAgentCompanyId: string,
    dto: { name: string; description?: string; agentId?: string },
  ) {
    return this.request<{
      id: string;
      companyId: string;
      agentId: string | null;
      name: string;
      description: string | null;
      active: boolean;
      createdAt: string;
      updatedAt: string;
    }>('post', `/companies/${overAgentCompanyId}/knowledge-bases`, dto);
  }

  async ingestKnowledgeBase(
    overAgentCompanyId: string,
    knowledgeBaseId: string,
    dto: { content: string; metadata?: Record<string, unknown> },
  ) {
    return this.request<Record<string, unknown>>(
      'post',
      `/companies/${overAgentCompanyId}/knowledge-bases/${knowledgeBaseId}/ingest`,
      dto,
    );
  }

  async generatePrompt(dto: Record<string, unknown>, agentId?: string) {
    const path = agentId
      ? `/agents/${agentId}/prompt-studio/generate`
      : '/prompt-studio/generate';
    return this.request<{ document: Record<string, unknown>; suggestedQuestions: string[] }>(
      'post',
      path,
      dto,
    );
  }

  async testPrompt(
    dto: {
      document: unknown;
      question: string;
      modelName?: string;
      ragChunks?: Array<{ content: string; score: number; id: string }>;
    },
    agentId?: string,
  ) {
    if (agentId) {
      return this.request<{ answer: string }>(
        'post',
        `/agents/${agentId}/prompt-studio/test`,
        dto,
      );
    }
    return this.request<{ answer: string }>('post', '/prompt-studio/test', {
      ...dto,
      ragChunks: dto.ragChunks ?? [],
    });
  }

  async proposePromptEdit(dto: Record<string, unknown>, agentId?: string) {
    const path = agentId
      ? `/agents/${agentId}/prompt-studio/propose`
      : '/prompt-studio/propose';
    return this.request<Record<string, unknown>>('post', path, dto);
  }

  async discardPromptStudioProposal(agentId: string) {
    return this.request<void>('post', `/agents/${agentId}/prompt-studio/thread/discard`);
  }

  async listPlatformAgents() {
    return this.request<MotorPlatformAgent[]>('get', '/platform-agents');
  }

  async getPlatformAgent(agentId: string) {
    return this.request<MotorPlatformAgent>('get', `/platform-agents/${agentId}`);
  }

  async runPlatformTurn(
    agentId: string,
    dto: {
      contextCompanyId: string;
      platformUserId: string;
      userName: string;
      companyName: string;
      text: string;
    },
  ) {
    return this.request<{ conversationId: string; reply: string }>(
      'post',
      `/platform-agents/${agentId}/turns`,
      dto,
      { preserve502: true, timeout: CUSTOMER_TURN_TIMEOUT_MS, customerMessage: CUSTOMER_TURN_FALLBACK },
    );
  }

  async listPlatformTurns(
    agentId: string,
    query: { contextCompanyId: string; platformUserId: string; limit: number },
  ) {
    const params = new URLSearchParams({
      contextCompanyId: query.contextCompanyId,
      platformUserId: query.platformUserId,
      limit: String(query.limit),
    });
    return this.request<{
      conversationId: string | null;
      messages: Array<{ id: string; role: string; content: string; createdAt: string }>;
    }>('get', `/platform-agents/${agentId}/turns?${params.toString()}`);
  }

  async fillWhatsappPrompt(dto: { model: string; answers: Record<string, string> }) {
    const path = '/agent-configurator/fill';
    try {
      const response = await firstValueFrom(
        this.httpService.post<{
          contextPrompt: string;
          systemPrompt: string;
          behaviorGuidelines: string;
          guardrails: string;
        }>(`${this.baseUrl}${path}`, dto),
      );
      return response.data;
    } catch (err) {
      const axiosError = err as AxiosError<{ missing?: string[] }>;
      if (
        axiosError.response?.status === 400 &&
        Array.isArray(axiosError.response.data?.missing)
      ) {
        throw new BadRequestException({ missing: axiosError.response.data.missing });
      }
      this.handleHttpError(err, path);
    }
  }

  runConfiguratorTurn(dto: Record<string, unknown>) {
    return this.request<{ conversationId: string; blocks: unknown[] }>(
      'post',
      '/agent-configurator/turns',
      dto,
      { preserve502: true, timeout: CUSTOMER_TURN_TIMEOUT_MS, customerMessage: CUSTOMER_TURN_FALLBACK },
    );
  }

  async streamConfiguratorTurn(dto: Record<string, unknown>, res: Response): Promise<void> {
    const path = '/agent-configurator/turns/stream';
    const response = await firstValueFrom(
      this.httpService.post<IncomingMessage>(`${this.baseUrl}${path}`, dto, {
        responseType: 'stream',
        timeout: CUSTOMER_TURN_TIMEOUT_MS,
        headers: { Accept: 'text/event-stream' },
      }),
    ).catch((err: unknown) => {
      this.handleHttpError(err, path, {
        preserve502: true,
        customerMessage: CUSTOMER_TURN_FALLBACK,
      });
    });

    res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();
    res.socket?.setNoDelay(true);

    const upstream = response.data;
    await new Promise<void>((resolve, reject) => {
      let settled = false;
      upstream.on('error', (error) => {
        if (settled) return;
        settled = true;
        reject(error);
      });
      upstream.on('end', () => {
        if (settled) return;
        settled = true;
        resolve();
      });
      upstream.pipe(res);
    });
  }

  listConfiguratorTurns(query: {
    contextCompanyId: string;
    platformUserId: string;
    targetAgentId: string;
    limit: number;
  }) {
    const params = new URLSearchParams({
      contextCompanyId: query.contextCompanyId,
      platformUserId: query.platformUserId,
      targetAgentId: query.targetAgentId,
      limit: String(query.limit),
    });
    return this.request<
      Array<{
        id: string;
        role: string;
        content: string;
        createdAt: string;
        blocks?: unknown[];
      }>
    >('get', `/agent-configurator/turns?${params.toString()}`);
  }

  decideConfiguratorProposal(
    messageId: string,
    action: 'accept' | 'reject',
    body: { contextCompanyId: string; platformUserId: string; targetAgentId: string },
  ) {
    return this.request<{ status: string; message?: string }>(
      'post',
      `/agent-configurator/proposals/${messageId}/${action}`,
      body,
    );
  }

  runPlaygroundTurn(body: {
    contextCompanyId: string;
    platformUserId: string;
    userName: string;
    targetAgentId: string;
    sessionId: string;
    content: string;
    history: Array<{ role?: string; content?: string }>;
  }) {
    return this.request<{ content: string }>('post', '/agent-playground/turns', body, {
      preserve502: true,
      timeout: CUSTOMER_TURN_TIMEOUT_MS,
      customerMessage: CUSTOMER_TURN_FALLBACK,
    });
  }
}

type MotorPlatformAgent = {
  id: string;
  name: string;
  description: string | null;
  active?: boolean;
  kind?: string;
  persona?: { personaName?: string | null; welcomeMessage?: string | null } | null;
};
