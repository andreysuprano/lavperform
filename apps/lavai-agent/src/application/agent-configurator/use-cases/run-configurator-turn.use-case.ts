import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { LLM_PROVIDER_PORT } from '../../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../../agent-runner/ports/llm-provider.port';
import { AGENT_RUN_TRACKER_PORT } from '../../agent-trace/ports/agent-run-tracker.port';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { scriptFor, type ServiceModel } from '../../prompt-studio/sheet-script';
import {
  CONFIGURATOR_CODE,
  ConfiguratorReplyError,
  joinedMarkdown,
  parseConfiguratorReply,
  stampProposal,
  toClientBlocks,
  type ClientBlock,
  type StoredBlock,
} from '../configurator-blocks';

const UNAVAILABLE = 'O configurador não está disponível.';

export interface ConfiguratorTurnInput {
  contextCompanyId: string;
  platformUserId: string;
  userName: string;
  companyName: string;
  targetAgentId: string;
  text: string;
  serviceModel: ServiceModel;
  answers: Record<string, string>;
}

@Injectable()
export class RunConfiguratorTurnUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
    @Inject(LLM_PROVIDER_PORT) private readonly llm: LlmProviderPort,
    @Inject(AGENT_RUN_TRACKER_PORT) private readonly tracker: AgentRunTrackerPort,
  ) {}

  async execute(input: ConfiguratorTurnInput): Promise<{ conversationId: string; blocks: ClientBlock[] }> {
    const configurator = await this.requireConfigurator();
    const target = await this.agents.findById(input.targetAgentId);
    if (!target || target.kind !== AgentKind.PUBLIC || !target.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const conversation = await this.conversations.upsert({
      agentId: configurator.id,
      contextCompanyId: input.contextCompanyId,
      platformUserId: input.platformUserId,
      targetAgentId: input.targetAgentId,
    });
    const userMessage = await this.conversations.addMessage({
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: input.text,
    });
    const history = await this.conversations.findRecentMessagesExcept(
      conversation.id,
      userMessage.id,
      configurator.memoryConfig?.windowSize ?? 10,
    );
    const baseUpdatedAt = target.persona.updatedAt.toISOString();
    const system = [
      readFileSync(join(__dirname, '../prompts/platform-configurator.prompt.md'), 'utf8'),
      '',
      `Pessoa: ${input.userName}. Empresa: ${input.companyName}.`,
      `updatedAt da persona: ${baseUpdatedAt}`,
      'Ficha:',
      ...scriptFor(input.serviceModel).map((field) => {
        const value = input.answers[field.key]?.trim();
        return value ? `- ${field.label}: ${value}` : '';
      }).filter(Boolean),
      'Prompt atual:',
      `contextPrompt: ${target.persona.contextPrompt ?? ''}`,
      `systemPrompt: ${target.persona.systemPrompt}`,
      `behaviorGuidelines: ${target.persona.behaviorGuidelines ?? ''}`,
      `guardrails: ${target.persona.guardrails ?? ''}`,
    ].join('\n');

    const runId = await this.tracker.startRun({
      agentId: configurator.id,
      companyId: configurator.companyId,
      conversationId: conversation.id,
      inputPrompt: input.text,
    });

    try {
      const response = await this.llm.complete({
        model: configurator.modelConfig?.modelName ?? 'openai/gpt-4o',
        temperature: 0.2,
        messages: [
          { role: 'system', content: system },
          ...history.map((message) => ({
            role: message.role === MessageRole.ASSISTANT ? 'assistant' as const : 'user' as const,
            content: message.content,
          })),
          { role: 'user', content: input.text },
        ],
      });
      const parsed = parseConfiguratorReply(response.content ?? '');
      const blocks = stampProposal(parsed, baseUpdatedAt);
      const saved = await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: joinedMarkdown(blocks),
        blocksJson: JSON.stringify(blocks),
        proposalStatus: blocks.some((block) => block.type === 'proposal') ? 'pending' : null,
      });
      await this.tracker.completeRun(runId, saved.content, 1, 0);
      return { conversationId: conversation.id, blocks: toClientBlocks(saved.id, 'pending', blocks) };
    } catch (error) {
      const message = error instanceof ConfiguratorReplyError
        ? error.message
        : error instanceof Error
          ? error.message
          : String(error);
      await this.tracker.failRun(runId, message);
      throw new BadGatewayException('A resposta falhou.');
    }
  }

  async list(input: Omit<ConfiguratorTurnInput, 'text' | 'userName' | 'companyName' | 'serviceModel' | 'answers'> & { limit?: number }) {
    const configurator = await this.requireConfigurator();
    const conversation = await this.conversations.findByTrio(
      configurator.id,
      input.contextCompanyId,
      input.platformUserId,
      input.targetAgentId,
    );
    if (!conversation) return [];
    const messages = await this.conversations.listLatestMessages(conversation.id, input.limit ?? 50);
    return messages.map((message) => ({
      id: message.id,
      role: message.role,
      content: message.content,
      createdAt: message.createdAt,
      blocks: message.role === MessageRole.ASSISTANT ? clientBlocksFrom(message) : undefined,
    }));
  }

  private async requireConfigurator() {
    const agent = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
    if (!agent || !agent.active) {
      throw new NotFoundException(UNAVAILABLE);
    }
    return agent;
  }
}

function clientBlocksFrom(message: { id: string; content: string; blocksJson?: string | null; proposalStatus?: string | null }) {
  if (!message.blocksJson) {
    return [{ type: 'markdown' as const, content: message.content }];
  }
  const blocks = JSON.parse(message.blocksJson) as StoredBlock[];
  const status = message.proposalStatus === 'accepted' || message.proposalStatus === 'rejected'
    ? message.proposalStatus
    : 'pending';
  return toClientBlocks(message.id, message.proposalStatus ? status : null, blocks);
}
