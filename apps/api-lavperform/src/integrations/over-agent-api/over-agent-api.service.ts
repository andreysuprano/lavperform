import {
  Injectable,
  Logger,
  InternalServerErrorException,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

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
  ): Promise<T> {
    const url = `${this.baseUrl}${path}`;
    try {
      const response = await firstValueFrom(
        method === 'get'
          ? this.httpService.get<T>(url)
          : method === 'delete'
            ? this.httpService.delete<T>(url)
            : method === 'patch'
              ? this.httpService.patch<T>(url, data)
              : method === 'put'
                ? this.httpService.put<T>(url, data)
                : this.httpService.post<T>(url, data),
      );
      return response.data;
    } catch (err) {
      this.handleHttpError(err, path);
    }
  }

  private handleHttpError(err: unknown, path: string): never {
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

    if (status === 502 || status === 503 || status === 504) {
      detail = `LavAI Agent indisponível (HTTP ${status}). Verifique se o container está rodando no Easypanel.`;
    }

    this.logger.error(`lavai-agent error [${status ?? 'NO_RESPONSE'}] ${url}: ${detail}`);

    if (status === 404) throw new NotFoundException(detail);
    if (status === 409) throw new ConflictException(detail);
    if (status === 400) throw new BadRequestException(detail);

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
}

/** @deprecated Use LavaiAgentApiService */
@Injectable()
export class OverAgentApiService extends LavaiAgentApiService {}
