import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { LavaiAgentApiService } from '../../integrations/over-agent-api/over-agent-api.service';
import { UazapiClient } from '../../whatsapp/uazapi/uazapi.client';
import { CreateAgentDto } from './dto/create-agent.dto';
import { UpdateAgentBaseDto } from './dto/update-agent-base.dto';
import { UpdatePersonaDto } from './dto/update-persona.dto';
import { UpdateModelConfigDto } from './dto/update-model-config.dto';
import { UpdateMemoryConfigDto } from './dto/update-memory-config.dto';
import { UpdateMediaConfigDto } from './dto/update-media-config.dto';
import { UpdateFilterConfigDto } from './dto/update-filter-config.dto';
import { UpdateJourneyConfigDto } from './dto/update-journey-config.dto';
import { UpdateNotificationConfigDto } from './dto/update-notification-config.dto';
import { CreateMcpServerDto } from './dto/create-mcp-server.dto';
import { UpdateMcpServerDto } from './dto/update-mcp-server.dto';
import { CreateKnowledgeFileDto, UpdateKnowledgeFileDto } from './dto/knowledge-file.dto';

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
    private readonly lavaiAgentApi: LavaiAgentApiService,
    private readonly uazapiClient: UazapiClient,
    private readonly configService: ConfigService,
  ) {
    // URL pública alcançável pela UAZAPI (não use host interno tipo lavai-agent:3000).
    this.aiAgentWebhookBaseUrl =
      this.configService.get<string>('LAVAI_AGENT_WEBHOOK_BASE_URL') ??
      this.configService.get<string>('BASE_URL_AGENTES') ??
      this.configService.get<string>('AI_AGENT_WEBHOOK_BASE_URL') ??
      this.configService.get<string>('LAVAI_AGENT_BASE_URL') ??
      this.configService.get<string>('OVER_AGENT_BASE_URL') ??
      'http://localhost:3000';
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
        'Empresa ainda não provisionada no LavAI Agent. Aguarde ou contate o suporte.',
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
    const webhookPathSuffix = `/webhooks/${overAgentCompanyId}/${agentId}`;

    const existingWebhooks = await this.uazapiClient.getWebhooks(whatsappInstance.token);

    if (existingWebhooks.some((webhook) => webhook.url === webhookUrl)) {
      this.logger.log(
        `Webhook do agente ${agentId} já existe na instância ${whatsappInstance.name}: ${webhookUrl}`,
      );
      return;
    }

    // Webhooks que apontam para este agente mas com URL base incorreta
    // (ex.: localhost gravado antes de configurar a URL pública). Precisam ser
    // removidos antes de recriar com a URL correta.
    const staleWebhooks = existingWebhooks.filter(
      (webhook) =>
        typeof webhook.url === 'string' &&
        webhook.url.endsWith(webhookPathSuffix) &&
        webhook.url !== webhookUrl,
    );

    for (const stale of staleWebhooks) {
      if (!stale.id) {
        continue;
      }
      try {
        await this.uazapiClient.setWebhook(
          whatsappInstance.token,
          stale.url ?? webhookUrl,
          ['messages'],
          { action: 'delete', id: stale.id },
        );
        this.logger.log(
          `Webhook desatualizado do agente ${agentId} removido da instância ${whatsappInstance.name}: ${stale.url}`,
        );
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : String(error);
        this.logger.error(
          `Falha ao remover webhook desatualizado do agente ${agentId} (${stale.url}): ${message}`,
        );
      }
    }

    await this.uazapiClient.setWebhook(
      whatsappInstance.token,
      webhookUrl,
      ['messages'],
      {
        action: 'add',
        excludeMessages: ['wasSentByApi', 'isGroupYes'],
      },
    );

    this.logger.log(
      `Webhook do agente ${agentId} criado na instância ${whatsappInstance.name}: ${webhookUrl}`,
    );
  }

  /**
   * Reaplica setupAgentWebhook quando a instância fica CONNECTED e já existe agente ativo.
   * Erros são logados e não propagados para não interromper o fluxo de conexão.
   */
  async ensureActiveAgentWebhook(companyId: string): Promise<void> {
    try {
      const agents = (await this.listAgents(companyId)) as OverAgentAgent[];
      const activeAgent = agents.find((agent) => agent.active === true);

      if (!activeAgent) {
        this.logger.log(
          `Nenhum agente ativo para company ${companyId}; webhook da IA não reconfigurado`,
        );
        return;
      }

      await this.setupAgentWebhook(companyId, activeAgent);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Falha ao garantir webhook da IA para company ${companyId}: ${message}`,
      );
    }
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

    const result = await this.lavaiAgentApi.createCompany({
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
    const agent = (await this.lavaiAgentApi.createAgent(
      overAgentCompanyId,
      dto as unknown as Record<string, unknown>,
    )) as OverAgentAgent;

    await this.setupAgentWebhook(companyId, agent);

    return agent;
  }

  async listAgents(companyId: string) {
    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    return this.lavaiAgentApi.listAgents(overAgentCompanyId);
  }

  async getAgent(agentId: string) {
    return this.lavaiAgentApi.getAgent(agentId);
  }

  async updateAgent(agentId: string, dto: UpdateAgentBaseDto) {
    return this.lavaiAgentApi.updateAgent(agentId, dto as unknown as Record<string, unknown>);
  }

  async toggleAgent(agentId: string) {
    const agent = (await this.lavaiAgentApi.toggleAgent(agentId)) as OverAgentAgent;

    if (agent.active) {
      const internalCompanyId = await this.getInternalCompanyIdByOverAgentCompanyId(
        agent.companyId,
      );
      await this.setupAgentWebhook(internalCompanyId, agent);
    }

    return agent;
  }

  async deleteAgent(agentId: string) {
    return this.lavaiAgentApi.deleteAgent(agentId);
  }

  // ─── Agent Configs ───────────────────────────────────────────────────────────

  async updatePersona(agentId: string, dto: UpdatePersonaDto) {
    return this.lavaiAgentApi.updatePersona(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateModelConfig(agentId: string, dto: UpdateModelConfigDto) {
    return this.lavaiAgentApi.updateModelConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateMemoryConfig(agentId: string, dto: UpdateMemoryConfigDto) {
    return this.lavaiAgentApi.updateMemoryConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateMediaConfig(agentId: string, dto: UpdateMediaConfigDto) {
    return this.lavaiAgentApi.updateMediaConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateFilterConfig(agentId: string, dto: UpdateFilterConfigDto) {
    return this.lavaiAgentApi.updateFilterConfig(agentId, dto as unknown as Record<string, unknown>);
  }

  async updateNotificationConfig(agentId: string, dto: UpdateNotificationConfigDto) {
    return this.lavaiAgentApi.updateNotificationConfig(
      agentId,
      dto as unknown as Record<string, unknown>,
    );
  }

  async updateJourneyConfig(agentId: string, dto: UpdateJourneyConfigDto) {
    return this.lavaiAgentApi.updateJourneyConfig(
      agentId,
      dto as unknown as Record<string, unknown>,
    );
  }

  // ─── Webhook ──────────────────────────────────────────────────────────────

  async updateAgentWebhook(companyId: string, agentId: string) {
    const agent = (await this.getAgent(agentId)) as unknown as OverAgentAgent;

    if (!agent) {
      throw new NotFoundException('Agente não encontrado');
    }

    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    if (agent.companyId !== overAgentCompanyId) {
      throw new NotFoundException('Agente não pertence a esta empresa');
    }

    await this.setupAgentWebhook(companyId, agent);

    return { success: true, message: 'Webhook do agente atualizado com sucesso.' };
  }

  // ─── MCP Servers ─────────────────────────────────────────────────────────────

  async createMcpServer(agentId: string, dto: CreateMcpServerDto) {
    return this.lavaiAgentApi.createMcpServer(agentId, dto as unknown as Record<string, unknown>);
  }

  async listMcpServers(agentId: string) {
    return this.lavaiAgentApi.listMcpServers(agentId);
  }

  async getMcpServer(mcpServerId: string) {
    return this.lavaiAgentApi.getMcpServer(mcpServerId);
  }

  async updateMcpServer(mcpServerId: string, dto: UpdateMcpServerDto) {
    return this.lavaiAgentApi.updateMcpServer(mcpServerId, dto as unknown as Record<string, unknown>);
  }

  async toggleMcpServer(mcpServerId: string) {
    return this.lavaiAgentApi.toggleMcpServer(mcpServerId);
  }

  async deleteMcpServer(mcpServerId: string) {
    return this.lavaiAgentApi.deleteMcpServer(mcpServerId);
  }

  // ─── LLM Models ─────────────────────────────────────────────────────────────

  async listLlmModels() {
    return this.lavaiAgentApi.listLlmModels();
  }

  // ─── Knowledge files (adapter → LavAI knowledge-bases) ─────────────────────

  private parseKnowledgeDescription(description: string | null): {
    fileUrl: string;
    status: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
  } {
    if (!description) {
      return { fileUrl: '', status: 'READY' };
    }
    try {
      const parsed = JSON.parse(description) as {
        fileUrl?: string;
        status?: 'PENDING' | 'PROCESSING' | 'READY' | 'ERROR';
      };
      return {
        fileUrl: parsed.fileUrl ?? '',
        status: parsed.status ?? 'READY',
      };
    } catch {
      return { fileUrl: description, status: 'READY' };
    }
  }

  private mapKnowledgeBaseToFile(
    kb: {
      id: string;
      agentId: string | null;
      name: string;
      description: string | null;
      active: boolean;
      createdAt: string;
      updatedAt: string;
    },
    agentId: string,
  ) {
    const meta = this.parseKnowledgeDescription(kb.description);
    return {
      id: kb.id,
      agentId,
      fileName: kb.name,
      fileUrl: meta.fileUrl,
      active: kb.active,
      status: meta.status,
      createdAt: kb.createdAt,
      updatedAt: kb.updatedAt,
    };
  }

  async listKnowledgeFiles(companyId: string, agentId: string) {
    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    const bases = await this.lavaiAgentApi.listKnowledgeBases(overAgentCompanyId);
    return bases
      .filter((kb) => kb.agentId === agentId)
      .map((kb) => this.mapKnowledgeBaseToFile(kb, agentId));
  }

  private async fetchFileContent(fileUrl: string): Promise<string> {
    const response = await fetch(fileUrl);
    if (!response.ok) {
      throw new NotFoundException('Não foi possível baixar o arquivo para indexação.');
    }
    return response.text();
  }

  async createKnowledgeFile(
    companyId: string,
    agentId: string,
    dto: CreateKnowledgeFileDto,
  ) {
    const overAgentCompanyId = await this.getOverAgentCompanyId(companyId);
    const description = JSON.stringify({
      fileUrl: dto.fileUrl,
      status: 'PROCESSING',
    });

    const kb = await this.lavaiAgentApi.createKnowledgeBase(overAgentCompanyId, {
      name: dto.fileName,
      description,
      agentId,
    });

    const content = await this.fetchFileContent(dto.fileUrl);
    await this.lavaiAgentApi.ingestKnowledgeBase(overAgentCompanyId, kb.id, {
      content,
      metadata: { fileUrl: dto.fileUrl, fileName: dto.fileName },
    });

    return this.mapKnowledgeBaseToFile(
      {
        ...kb,
        description: JSON.stringify({
          fileUrl: dto.fileUrl,
          status: 'READY',
        }),
      },
      agentId,
    );
  }

  async updateKnowledgeFile(
    companyId: string,
    agentId: string,
    fileId: string,
    dto: UpdateKnowledgeFileDto,
  ) {
    const files = await this.listKnowledgeFiles(companyId, agentId);
    const existing = files.find((f) => f.id === fileId);
    if (!existing) {
      throw new NotFoundException('Arquivo de conhecimento não encontrado');
    }

    return {
      ...existing,
      fileName: dto.fileName ?? existing.fileName,
      fileUrl: dto.fileUrl ?? existing.fileUrl,
      active: dto.active ?? existing.active,
    };
  }

  async deleteKnowledgeFile(companyId: string, agentId: string, fileId: string) {
    const files = await this.listKnowledgeFiles(companyId, agentId);
    if (!files.some((f) => f.id === fileId)) {
      throw new NotFoundException('Arquivo de conhecimento não encontrado');
    }
    this.logger.warn(
      `deleteKnowledgeFile: remoção de KB ${fileId} pendente de endpoint no LavAI Agent`,
    );
  }
}
