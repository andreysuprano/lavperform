import { BadGatewayException, Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { readFileSync } from 'fs';
import { join } from 'path';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { LLM_PROVIDER_PORT } from '../../agent-runner/ports/llm-provider.port';
import type { LlmMessage, LlmProviderPort } from '../../agent-runner/ports/llm-provider.port';
import { AGENT_RUN_TRACKER_PORT } from '../../agent-trace/ports/agent-run-tracker.port';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { scriptFor, type ServiceModel } from '../../prompt-studio/sheet-script';
import {
  ACTIVITY,
  activityLabel,
  agentSnapshot,
  configuratorTools,
  runConfiguratorTool,
  type ConfiguratorActivityEvent,
} from '../configurator-actions';
import {
  CONFIGURATOR_CODE,
  ConfiguratorReplyError,
  finalizeConfiguratorReply,
  joinedMarkdown,
  toClientBlocks,
  type ClientBlock,
  type ProposalDraft,
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
  private readonly logger = new Logger(RunConfiguratorTurnUseCase.name);

  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
    @Inject(LLM_PROVIDER_PORT) private readonly llm: LlmProviderPort,
    @Inject(AGENT_RUN_TRACKER_PORT) private readonly tracker: AgentRunTrackerPort,
  ) {}

  async execute(
    input: ConfiguratorTurnInput,
    onActivity?: (event: ConfiguratorActivityEvent) => void,
  ): Promise<{ conversationId: string; blocks: ClientBlock[] }> {
    const sequence = { value: 0 };
    const recorded: string[] = [];
    const finishRead = openActivity(onActivity, ACTIVITY.readAgent, sequence, null);
    const configurator = await this.requireConfigurator();
    const target = await this.agents.findById(input.targetAgentId);
    if (!target || target.kind !== AgentKind.PUBLIC || !target.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }
    finishRead();

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
    const persona = target.persona;
    const baseUpdatedAt = persona.updatedAt.toISOString();
    const facts = scriptFor(input.serviceModel)
      .map((field) => {
        const value = input.answers[field.key]?.trim();
        return value ? `- ${field.label}: ${value}` : '';
      })
      .filter(Boolean);
    const snapshot = agentSnapshot(facts, {
      contextPrompt: persona.contextPrompt ?? '',
      systemPrompt: persona.systemPrompt,
      behaviorGuidelines: persona.behaviorGuidelines ?? '',
      guardrails: persona.guardrails ?? '',
    });
    const system = [
      readFileSync(join(__dirname, '../prompts/platform-configurator.prompt.md'), 'utf8'),
      '',
      `Pessoa: ${input.userName}. Empresa: ${input.companyName}.`,
    ].join('\n');
    const messages: LlmMessage[] = [
      { role: 'system', content: system },
      ...history.map((message) => ({
        role: message.role === MessageRole.ASSISTANT ? 'assistant' as const : 'user' as const,
        content: message.content,
      })),
      { role: 'user', content: input.text },
    ];

    const runId = await this.tracker.startRun({
      agentId: configurator.id,
      companyId: configurator.companyId,
      conversationId: conversation.id,
      inputPrompt: input.text,
    });
    onActivity?.({
      type: 'activity',
      id: `a${++sequence.value}`,
      label: ACTIVITY.thinking,
      status: 'running',
    });

    try {
      let proposal: ProposalDraft | null = null;
      let content: string | null = null;
      let iterations = 0;
      let toolCount = 0;
      const tools = configuratorTools();
      const model = configurator.modelConfig?.modelName ?? 'openai/gpt-4o';

      for (let iteration = 0; iteration < 4; iteration += 1) {
        const started = Date.now();
        const response = await this.llm.complete({
          model,
          temperature: 0.2,
          messages,
          tools,
        });
        iterations += 1;
        await this.tracker.addStep(runId, {
          stepType: 'LLM_CALL',
          toolName: model,
          input: { messageCount: messages.length, toolCount: tools.length },
          output: { finishReason: response.finishReason, toolCallCount: response.toolCalls.length },
          durationMs: Date.now() - started,
          iteration,
        });

        if (response.toolCalls.length === 0) {
          content = response.content;
          break;
        }

        messages.push({
          role: 'assistant',
          content: response.content,
          tool_calls: response.toolCalls,
        });

        for (const call of response.toolCalls) {
          const finishTool = openActivity(onActivity, activityLabel(call.function.name), sequence, recorded);
          const result = runConfiguratorTool(call.function.name, call.function.arguments, snapshot, proposal != null);
          if (result.proposal) proposal = result.proposal;
          toolCount += 1;
          await this.tracker.addStep(runId, {
            stepType: 'TOOL_CALL',
            toolName: call.function.name,
            output: { proposed: result.proposal != null },
            durationMs: 0,
            iteration,
          });
          messages.push({
            role: 'tool',
            content: result.content,
            tool_call_id: call.id,
          });
          finishTool();
        }
      }

      const reply = finalizeConfiguratorReply(content, proposal, baseUpdatedAt);
      const stored: StoredBlock[] = [
        ...recorded.map((label) => ({ type: 'activity' as const, label })),
        ...reply,
      ];
      const saved = await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: joinedMarkdown(stored),
        blocksJson: JSON.stringify(stored),
        proposalStatus: stored.some((block) => block.type === 'proposal') ? 'pending' : null,
      });
      await this.tracker.completeRun(runId, saved.content, iterations, toolCount);
      return { conversationId: conversation.id, blocks: toClientBlocks(saved.id, 'pending', stored) };
    } catch (error) {
      const message = failureMessage(error);
      this.logger.error(`Turno do configurador falhou: ${message}`);
      try {
        await this.tracker.failRun(runId, message);
      } catch (trackerError) {
        const trackerMessage = trackerError instanceof Error ? trackerError.message : String(trackerError);
        this.logger.error(`Falha ao registrar o turno: ${trackerMessage}`);
      }
      throw new BadGatewayException(message);
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

function failureMessage(error: unknown): string {
  if (error instanceof ConfiguratorReplyError) return error.message;
  const message = (error instanceof Error ? error.message : String(error)).replace(/\s+/g, ' ').trim();
  if (!message) return 'A resposta falhou.';
  return message.length > 300 ? `${message.slice(0, 300)}…` : message;
}

function openActivity(
  onActivity: ((event: ConfiguratorActivityEvent) => void) | undefined,
  label: string,
  sequence: { value: number },
  store: string[] | null,
) {
  const id = `a${++sequence.value}`;
  onActivity?.({ type: 'activity', id, label, status: 'running' });
  return () => {
    onActivity?.({ type: 'activity', id, label, status: 'done' });
    store?.push(label);
  };
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
