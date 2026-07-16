import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { OverAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';
import { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentBaseDto } from './dto/update-agent-base.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';
import { UpdateMemoryConfigDto } from './dto/update-memory-config.dto';
import { UpdateMediaConfigDto } from './dto/update-media-config.dto';
import { UpdateFilterConfigDto } from './dto/update-filter-config.dto';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { UpdateMcpServerDto } from './dto/update-mcp-server.dto';

type OverAgentAgent = {
  id: string;
  companyId: string;
  active?: boolean;
  instanceName?: string;
};

@Injectable()
export class AiAgentService {
  private readonly logger = new Logger(AiAgentService.name);
  private readonly aiAgentWebhookBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly overAgentApi: OverAgentApiService,
    private readonly uazapiClient: UazapiClient,
    private readonly configService: ConfigService,
  ) {
    this.aiAgentWebhookBaseUrl =
      this.configService.get<string>('BASE_URL_AGENTES') ??
      this.configService.get<string>(
        'AI_AGENT_WEBHOOK_BASE_URL',
        'http://verticeia-new-ai.du3cfm.easypanel.host',
      );
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private async getOverAgentCompanyId(companyId: string): Promise<string> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { overAgentCompanyId: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (!company.overAgentCompanyId) {
      throw new NotFoundException(
        'Empresa ainda não provisionada no over-agent. Aguarde ou contate o suporte.',
      );
    }

    return company.overAgentCompanyId;
  }

  private buildAgentWebhookUrl(overAgentCompanyId: string, agentId: string): string {
    const base = this.aiAgentWebhookBaseUrl.replace(/\/$/, '');
    return `${base}/webhooks/${overAgentCompanyId}/${agentId}`;
  }

  private async setupAgentWebhook(
    internalCompanyId: string,
    agent: OverAgentAgent,
  ): Promise<void> {
    const { id: agentId, companyId: overAgentCompanyId } = agent;

    const whatsappInstance = await this.prisma.whatsappInstance.findUnique({
      where: { companyId: internalCompanyId },
    });

    if (!whatsappInstance) {
      throw new NotFoundException(
        'Instância WhatsApp não encontrada para esta empresa. Conecte o WhatsApp antes de criar ou ativar o agente.',
      );
    }

    const webhookUrl = this.buildAgentWebhookUrl(overAgentCompanyId, agentId);

    await this.uazapiClient.setWebhook(
      whatsappInstance.token,
      webhookUrl,
      ['messages'],
      { excludeMessages: ['wasSentByApi', 'isGroupYes'] },
    );

    this.logger.log(
      `Webhook do agente ${agentId} configurado na instância ${whatsappInstance.name}: ${webhookUrl}`,
    );
  }

  private async getInternalCompanyIdByOverAgentCompanyId(
    overAgentCompanyId: string,
  ): Promise<string> {
    const company = await this.prisma.company.findFirst({
      where: { overAgentCompanyId },
      select: { id: true },
    });

    if (!company) {
      throw new NotFoundException(
        'Empresa não encontrada para o overAgentCompanyId informado.',
      );
    }

    return company.id;
  }

  // ─── Provisionamento ────────────────────────────────────────────────────────

  /**
   * Cria a company correspondente no over-agent-api e armazena o ID retornado.
   * Chamado automaticamente quando uma empresa é criada no sistema.
   */
  async provisionCompany(companyId: string): Promise<void> {
    const company = await this.prisma.company.findUnique({
      where: { id: companyId },
      select: { id: true, name: true, slug: true, email: true, phone: true, overAgentCompanyId: true },
    });

    if (!company) {
      throw new NotFoundException('Empresa não encontrada');
    }

    if (company.overAgentCompanyId) {
      this.logger.log(`Empresa ${companyId} já provisionada no over-agent: ${company.overAgentCompanyId}`);
      return;
    }

    const slug = company.slug ?? company.id;

    const result = await this.overAgentApi.createCompany({
      name: company.name,
      slug,
      email: company.email ?? undefined,
      phone: company.phone ?? undefined,
    });

    const overAgentCompanyId = result['id'] as string;

    await this.prisma.company.update({
      where: { id: companyId },
      data: { overAgentCompanyId },
    });

    this.logger.log(`Empresa ${companyId} provisionada no over-agent com ID: ${overAgentCompanyId}`);
  }

  // ─── Agents ─────────────────────────────────────────────────────────────────

  async createAgent(companyId: string, dto: CreateAgentDto) {
    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    const agent = (await this.overAgentApi.createAgent(
      overAgentCompanyId,
      dto as unknown as Record<string, unknown>,
    )) as OverAgentAgent;

    await this.setupAgentWebhook(companyId, agent);

    return agent;
  }

  async listAgents(companyId: string) {
    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    return this.overAgentApi.listAgents(overAgentCompanyId);
  }

  async getAgent(agentId: string) {
    return this.overAgentApi.getAgent(agentId);
  }

  async updateAgent(agentId: string, dto: UpdateAgentBaseDto) {
    return this.overAgentApi.updateAgent(agentId, dto as unknown as Record<string, unknown>);
  }

  async toggleAgent(agentId: string) {
    const agent = (await this.overAgentApi.toggleAgent(agentId)) as OverAgentAgent;

    if (agent.active) {
      const internalCompanyId = await this.getInternalCompanyIdByOverAgentCompanyId(
        agent.companyId,
      );
      await this.setupAgentWebhook(internalCompanyId, agent);
    }

    return agent;
  }

  async deleteAgent(agentId: string) {
    return this.overAgentApi.deleteAgent(agentId);
  }

  // ─── Agent Configs ───────────────────────────────────────────────────────────

  async updatePersona(agentId: string, dto: UpdatePersonaDto) {
    return this.overAgentApi.updatePersona(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateModelConfig(agentId: string, dto: UpdateModelConfigDto) {
    return this.overAgentApi.updateModelConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateMemoryConfig(agentId: string, dto: UpdateMemoryConfigDto) {
    return this.overAgentApi.updateMemoryConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateMediaConfig(agentId: string, dto: UpdateMediaConfigDto) {
    return this.overAgentApi.updateMediaConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateFilterConfig(agentId: string, dto: UpdateFilterConfigDto) {
    return this.overAgentApi.updateFilterConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  // ─── MCP Servers ─────────────────────────────────────────────────────────────

  async createMcpServer(agentId: string, dto: CreateMcpServerDto) {
    return this.overAgentApi.createMcpServer(agentId, dto as unknown as Record<string, unknown>);
  }

  async listMcpServers(agentId: string) {
    return this.overAgentApi.listMcpServers(agentId);
  }

  async getMcpServer(mcpServerId: string) {
    return this.overAgentApi.getMcpServer(mcpServerId);
  }

  async updateMcpServer(mcpServerId: string, dto: UpdateMcpServerDto) {
    return this.overAgentApi.updateMcpServer(mcpServerId, dto as unknown as Record<string, unknown>);
  }

  async toggleMcpServer(mcpServerId: string) {
    return this.overAgentApi.toggleMcpServer(mcpServerId);
  }

  async deleteMcpServer(mcpServerId: string) {
    return this.overAgentApi.deleteMcpServer(mcpServerId);
  }

  // ─── LLM Models ─────────────────────────────────────────────────────────────

  async listLlmModels() {
    return this.overAgentApi.listLlmModels();
  }
}
