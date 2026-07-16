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
export class OverAgentApiService {
  private readonly logger = new Logger(OverAgentApiService.name);
  private readonly baseUrl: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.baseUrl = this.configService.get<string>('OVER_AGENT_BASE_URL', 'http://over-agent:3000');
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  private async request<T>(
    method: 'get' | 'post' | 'patch' | 'delete',
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
              : this.httpService.post<T>(url, data),
      );
      return response.data;
    } catch (err) {
      this.handleHttpError(err, path);
    }
  }

  private handleHttpError(err: unknown, path: string): never {
    const axiosError = err as AxiosError<{ message: string | string[]; error: string }>;
    const status = axiosError.response?.status;
    const responseData = axiosError.response?.data;
    const message = Array.isArray(responseData?.message)
      ? responseData.message
      : responseData?.message ?? 'Erro ao comunicar com over-agent-api';

    this.logger.error(`over-agent-api error [${status}] ${path}: ${JSON.stringify(message)}`);

    if (status === 404) throw new NotFoundException(message);
    if (status === 409) throw new ConflictException(message);
    if (status === 400) throw new BadRequestException(message);

    throw new InternalServerErrorException(
      `Falha na integração com over-agent-api: ${JSON.stringify(message)}`,
    );
  }

  // ─── Companies ────────────────────────────────────────────────────────────

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

  // ─── Agents ───────────────────────────────────────────────────────────────

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

  // ─── Agent Configs ────────────────────────────────────────────────────────

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

  // ─── MCP Servers ──────────────────────────────────────────────────────────

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

  // ─── LLM Models ───────────────────────────────────────────────────────────

  async listLlmModels() {
    return this.request<Record<string, unknown>[]>('get', '/llm/models');
  }
}
