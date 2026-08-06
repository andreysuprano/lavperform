import { Injectable } from '@nestjs/common';
import {
  AgentCommunicationStyle,
  AgentData,
  AgentFilterConfigData,
  AgentJourneyConfigData,
  AgentLanguage,
  AgentMediaConfigData,
  AgentMemoryConfigData,
  AgentMemoryType,
  AgentModelConfigData,
  AgentNotificationConfigData,
  AgentPersonaData,
  AgentRepositoryPort,
  AgentVoiceTone,
  AgentWithConfigsData,
  CreateAgentInput,
  FollowUpStepData,
  JourneyTrigger,
  LlmProvider,
  UpdateAgentFilterConfigInput,
  UpdateAgentInput,
  UpdateAgentJourneyConfigInput,
  UpdateAgentMediaConfigInput,
  UpdateAgentMemoryConfigInput,
  UpdateAgentModelConfigInput,
  UpdateAgentNotificationConfigInput,
  UpdateAgentPersonaInput,
} from '../../../application/agent/ports/agent.repository.port';
import { PrismaService } from '../prisma/prisma.service';

const includeConfigs = {
  persona: true,
  modelConfig: true,
  memoryConfig: true,
  mediaConfig: true,
  filterConfig: true,
  journeyConfig: true,
  notificationConfig: true,
} as const;

@Injectable()
export class PrismaAgentRepository implements AgentRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(input: CreateAgentInput): Promise<AgentWithConfigsData> {
    const row = await this.prisma.agent.create({
      data: {
        companyId: input.companyId,
        name: input.name,
        description: input.description,
        instanceName: input.instanceName ?? null,
        persona: {
          create: {
            personaName: input.persona?.personaName ?? input.name,
            personaDescription: input.persona?.personaDescription,
            systemPrompt: input.persona?.systemPrompt ?? `Você é ${input.name}, um assistente virtual. Responda de forma cordial e objetiva.`,
            behaviorGuidelines: input.persona?.behaviorGuidelines,
            guardrails: input.persona?.guardrails,
            contextPrompt: input.persona?.contextPrompt,
            welcomeMessage: input.persona?.welcomeMessage,
            voiceTone: input.persona?.voiceTone,
            communicationStyle: input.persona?.communicationStyle,
            language: input.persona?.language,
          },
        },
        modelConfig: {
          create: {
            provider: input.modelConfig?.provider,
            modelName: input.modelConfig?.modelName,
            temperature: input.modelConfig?.temperature,
            maxTokens: input.modelConfig?.maxTokens,
            topP: input.modelConfig?.topP,
            frequencyPenalty: input.modelConfig?.frequencyPenalty,
            presencePenalty: input.modelConfig?.presencePenalty,
            streaming: input.modelConfig?.streaming,
          },
        },
        memoryConfig: {
          create: {
            memoryType: input.memoryConfig?.memoryType,
            windowSize: input.memoryConfig?.windowSize,
            maxSummaryTokens: input.memoryConfig?.maxSummaryTokens,
            useLongTermMemory: input.memoryConfig?.useLongTermMemory,
          },
        },
        journeyConfig: {
          create: {
            enabled: false,
            followUpSteps: [],
          },
        },
      },
      include: includeConfigs,
    });
    return this.mapWithConfigs(row);
  }

  async findById(id: string): Promise<AgentWithConfigsData | null> {
    const row = await this.prisma.agent.findUnique({
      where: { id },
      include: includeConfigs,
    });
    return row ? this.mapWithConfigs(row) : null;
  }

  async findAllByCompany(companyId: string): Promise<AgentData[]> {
    const rows = await this.prisma.agent.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
    return rows.map(this.mapBase);
  }

  async findFirstActiveByCompany(companyId: string): Promise<AgentWithConfigsData | null> {
    const row = await this.prisma.agent.findFirst({
      where: { companyId, active: true },
      include: includeConfigs,
      orderBy: { createdAt: 'asc' },
    });
    return row ? this.mapWithConfigs(row) : null;
  }

  async findActiveByInstanceName(
    instanceName: string,
    companyId: string,
  ): Promise<AgentWithConfigsData | null> {
    const row = await this.prisma.agent.findFirst({
      where: { instanceName, companyId, active: true },
      include: includeConfigs,
    });
    return row ? this.mapWithConfigs(row) : null;
  }

  async update(id: string, input: UpdateAgentInput): Promise<AgentData> {
    const row = await this.prisma.agent.update({ where: { id }, data: input });
    return this.mapBase(row);
  }

  async updatePersona(agentId: string, input: UpdateAgentPersonaInput): Promise<AgentPersonaData> {
    const row = await this.prisma.agentPersona.upsert({
      where: { agentId },
      update: input,
      create: {
        agentId,
        personaName: input.personaName ?? '',
        systemPrompt: input.systemPrompt ?? '',
        ...input,
      },
    });
    return this.mapPersona(row);
  }

  async updateModelConfig(agentId: string, input: UpdateAgentModelConfigInput): Promise<AgentModelConfigData> {
    const row = await this.prisma.agentModelConfig.upsert({
      where: { agentId },
      update: input,
      create: { agentId, ...input },
    });
    return this.mapModelConfig(row);
  }

  async updateMemoryConfig(agentId: string, input: UpdateAgentMemoryConfigInput): Promise<AgentMemoryConfigData> {
    const row = await this.prisma.agentMemoryConfig.upsert({
      where: { agentId },
      update: input,
      create: { agentId, ...input },
    });
    return this.mapMemoryConfig(row);
  }

  async updateMediaConfig(agentId: string, input: UpdateAgentMediaConfigInput): Promise<AgentMediaConfigData> {
    const row = await this.prisma.agentMediaConfig.upsert({
      where: { agentId },
      update: input,
      create: { agentId, ...input },
    });
    return this.mapMediaConfig(row);
  }

  async updateFilterConfig(agentId: string, input: UpdateAgentFilterConfigInput): Promise<AgentFilterConfigData> {
    const row = await this.prisma.agentFilterConfig.upsert({
      where: { agentId },
      update: input,
      create: { agentId, ...input },
    });
    return this.mapFilterConfig(row);
  }

  async updateJourneyConfig(
    agentId: string,
    input: UpdateAgentJourneyConfigInput,
  ): Promise<AgentJourneyConfigData> {
    const data = {
      ...input,
      followUpSteps: input.followUpSteps
        ? (input.followUpSteps as unknown as object[])
        : undefined,
    };
    const row = await this.prisma.agentJourneyConfig.upsert({
      where: { agentId },
      update: data,
      create: {
        agentId,
        enabled: input.enabled ?? false,
        journeyTrigger: input.journeyTrigger ?? JourneyTrigger.FIRST_MESSAGE,
        followUpEnabled: input.followUpEnabled ?? true,
        cancelOnReply: input.cancelOnReply ?? true,
        followUpSteps: (input.followUpSteps ?? []) as unknown as object[],
        helpKeywords: input.helpKeywords ?? ['atendente', 'humano', 'ajuda'],
        helpAutoEscalate: input.helpAutoEscalate ?? true,
        helpAckMessage: input.helpAckMessage ?? null,
        purchaseWebhookEnabled: input.purchaseWebhookEnabled ?? true,
      },
    });
    return this.mapJourneyConfig(row);
  }

  async updateNotificationConfig(
    agentId: string,
    input: UpdateAgentNotificationConfigInput,
  ): Promise<AgentNotificationConfigData> {
    const row = await this.prisma.agentNotificationConfig.upsert({
      where: { agentId },
      update: {
        ...(input.helpNotificationEnabled !== undefined
          ? { helpNotificationEnabled: input.helpNotificationEnabled }
          : {}),
        ...(input.helpNotificationPhone !== undefined
          ? { helpNotificationPhone: input.helpNotificationPhone }
          : {}),
      },
      create: {
        agentId,
        helpNotificationEnabled: input.helpNotificationEnabled ?? false,
        helpNotificationPhone: input.helpNotificationPhone ?? null,
      },
    });
    return this.mapNotificationConfig(row);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.agent.delete({ where: { id } });
  }

  // ─── Mappers ───────────────────────────────────────────────────────────────

  private mapBase(row: {
    id: string; companyId: string; name: string; description: string | null;
    active: boolean; instanceName?: string | null; createdAt: Date; updatedAt: Date;
  }): AgentData {
    return {
      id: row.id,
      companyId: row.companyId,
      name: row.name,
      description: row.description,
      active: row.active,
      instanceName: row.instanceName ?? null,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapPersona(row: {
    id: string; agentId: string; personaName: string; personaDescription: string | null;
    systemPrompt: string; behaviorGuidelines: string | null; guardrails: string | null;
    contextPrompt: string | null; welcomeMessage: string | null; messageSignature: string | null;
    voiceTone: string; communicationStyle: string; language: string;
    createdAt: Date; updatedAt: Date;
  }): AgentPersonaData {
    return {
      id: row.id,
      agentId: row.agentId,
      personaName: row.personaName,
      personaDescription: row.personaDescription,
      systemPrompt: row.systemPrompt,
      behaviorGuidelines: row.behaviorGuidelines,
      guardrails: row.guardrails,
      contextPrompt: row.contextPrompt,
      welcomeMessage: row.welcomeMessage,
      messageSignature: row.messageSignature,
      voiceTone: row.voiceTone as AgentVoiceTone,
      communicationStyle: row.communicationStyle as AgentCommunicationStyle,
      language: row.language as AgentLanguage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapModelConfig(row: {
    id: string; agentId: string; provider: string; modelName: string;
    temperature: number; maxTokens: number; topP: number;
    frequencyPenalty: number; presencePenalty: number; streaming: boolean;
    createdAt: Date; updatedAt: Date;
  }): AgentModelConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      provider: row.provider as LlmProvider,
      modelName: row.modelName,
      temperature: row.temperature,
      maxTokens: row.maxTokens,
      topP: row.topP,
      frequencyPenalty: row.frequencyPenalty,
      presencePenalty: row.presencePenalty,
      streaming: row.streaming,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapMemoryConfig(row: {
    id: string; agentId: string; memoryType: string; windowSize: number;
    maxSummaryTokens: number; useLongTermMemory: boolean;
    createdAt: Date; updatedAt: Date;
  }): AgentMemoryConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      memoryType: row.memoryType as AgentMemoryType,
      windowSize: row.windowSize,
      maxSummaryTokens: row.maxSummaryTokens,
      useLongTermMemory: row.useLongTermMemory,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapMediaConfig(row: {
    id: string; agentId: string;
    audioEnabled: boolean; audioDefaultMessage: string | null;
    imageEnabled: boolean; imageExtractionPrompt: string | null; imageDefaultMessage: string | null;
    videoEnabled: boolean; videoExtractionPrompt: string | null; videoDefaultMessage: string | null;
    createdAt: Date; updatedAt: Date;
  }): AgentMediaConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      audioEnabled: row.audioEnabled,
      audioDefaultMessage: row.audioDefaultMessage,
      imageEnabled: row.imageEnabled,
      imageExtractionPrompt: row.imageExtractionPrompt,
      imageDefaultMessage: row.imageDefaultMessage,
      videoEnabled: row.videoEnabled,
      videoExtractionPrompt: row.videoExtractionPrompt,
      videoDefaultMessage: row.videoDefaultMessage,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapFilterConfig(row: {
    id: string; agentId: string;
    allowedPhones: string[]; allowedGroups: string[];
    triggerEnabled: boolean; triggerWords: string[];
    triggerCaseSensitive: boolean; triggerRemoveFromText: boolean;
    createdAt: Date; updatedAt: Date;
  }): AgentFilterConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      allowedPhones: row.allowedPhones,
      allowedGroups: row.allowedGroups,
      triggerEnabled: row.triggerEnabled,
      triggerWords: row.triggerWords,
      triggerCaseSensitive: row.triggerCaseSensitive,
      triggerRemoveFromText: row.triggerRemoveFromText,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapJourneyConfig(row: {
    id: string;
    agentId: string;
    enabled: boolean;
    journeyTrigger: string;
    followUpEnabled: boolean;
    cancelOnReply: boolean;
    followUpSteps: unknown;
    helpKeywords: string[];
    helpAutoEscalate: boolean;
    helpAckMessage: string | null;
    purchaseWebhookEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
  }): AgentJourneyConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      enabled: row.enabled,
      journeyTrigger: row.journeyTrigger as JourneyTrigger,
      followUpEnabled: row.followUpEnabled,
      cancelOnReply: row.cancelOnReply,
      followUpSteps: (row.followUpSteps as FollowUpStepData[]) ?? [],
      helpKeywords: row.helpKeywords,
      helpAutoEscalate: row.helpAutoEscalate,
      helpAckMessage: row.helpAckMessage,
      purchaseWebhookEnabled: row.purchaseWebhookEnabled,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapNotificationConfig(row: {
    id: string;
    agentId: string;
    helpNotificationEnabled: boolean;
    helpNotificationPhone: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): AgentNotificationConfigData {
    return {
      id: row.id,
      agentId: row.agentId,
      helpNotificationEnabled: row.helpNotificationEnabled,
      helpNotificationPhone: row.helpNotificationPhone,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private mapWithConfigs(row: {
    id: string; companyId: string; name: string; description: string | null;
    active: boolean; instanceName?: string | null; createdAt: Date; updatedAt: Date;
    persona: Parameters<PrismaAgentRepository['mapPersona']>[0] | null;
    modelConfig: Parameters<PrismaAgentRepository['mapModelConfig']>[0] | null;
    memoryConfig: Parameters<PrismaAgentRepository['mapMemoryConfig']>[0] | null;
    mediaConfig: Parameters<PrismaAgentRepository['mapMediaConfig']>[0] | null;
    filterConfig: Parameters<PrismaAgentRepository['mapFilterConfig']>[0] | null;
    journeyConfig: Parameters<PrismaAgentRepository['mapJourneyConfig']>[0] | null;
    notificationConfig: Parameters<PrismaAgentRepository['mapNotificationConfig']>[0] | null;
  }): AgentWithConfigsData {
    return {
      ...this.mapBase(row),
      persona: row.persona ? this.mapPersona(row.persona) : null,
      modelConfig: row.modelConfig ? this.mapModelConfig(row.modelConfig) : null,
      memoryConfig: row.memoryConfig ? this.mapMemoryConfig(row.memoryConfig) : null,
      mediaConfig: row.mediaConfig ? this.mapMediaConfig(row.mediaConfig) : null,
      filterConfig: row.filterConfig ? this.mapFilterConfig(row.filterConfig) : null,
      journeyConfig: row.journeyConfig ? this.mapJourneyConfig(row.journeyConfig) : null,
      notificationConfig: row.notificationConfig
        ? this.mapNotificationConfig(row.notificationConfig)
        : null,
    };
  }
}
