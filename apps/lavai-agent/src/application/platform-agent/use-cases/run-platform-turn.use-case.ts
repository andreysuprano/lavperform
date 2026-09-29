import { BadGatewayException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { LLM_PROVIDER_PORT } from '../../agent-runner/ports/llm-provider.port';
import type { LlmProviderPort } from '../../agent-runner/ports/llm-provider.port';
import { PromptBuilderService } from '../../agent-runner/services/prompt-builder.service';
import { AGENT_RUN_TRACKER_PORT } from '../../agent-trace/ports/agent-run-tracker.port';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';
import {
  MessageRole,
  type ConversationMessageData,
} from '../../webhook/ports/conversation.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../ports/platform-conversation.repository.port';
import type {
  PlatformConversationRepositoryPort,
  PlatformMessageData,
} from '../ports/platform-conversation.repository.port';

export interface RunPlatformTurnInput {
  contextCompanyId: string;
  platformUserId: string;
  userName: string;
  companyName: string;
  text: string;
}

@Injectable()
export class RunPlatformTurnUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
    private readonly promptBuilder: PromptBuilderService,
    @Inject(LLM_PROVIDER_PORT)
    private readonly llm: LlmProviderPort,
    @Inject(AGENT_RUN_TRACKER_PORT)
    private readonly tracker: AgentRunTrackerPort,
  ) {}

  async execute(
    agentId: string,
    input: RunPlatformTurnInput,
  ): Promise<{ conversationId: string; reply: string }> {
    const agent = await this.agents.findById(agentId);
    if (!agent || agent.kind !== AgentKind.INTERNAL || !agent.active) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const conversation = await this.conversations.upsert({
      agentId: agent.id,
      contextCompanyId: input.contextCompanyId,
      platformUserId: input.platformUserId,
    });
    const userMessage = await this.conversations.addMessage({
      conversationId: conversation.id,
      role: MessageRole.USER,
      content: input.text,
    });
    const history = await this.conversations.findRecentMessagesExcept(
      conversation.id,
      userMessage.id,
      agent.memoryConfig?.windowSize ?? 10,
    );

    const runId = await this.tracker.startRun({
      agentId: agent.id,
      companyId: agent.companyId,
      conversationId: conversation.id,
      inputPrompt: input.text,
    });

    try {
      const messages = this.promptBuilder.build(
        agent,
        history.map(toPromptMessage),
        [],
        input.text,
        undefined,
        { userName: input.userName, companyName: input.companyName },
      );
      const started = Date.now();
      const response = await this.llm.complete({
        model: agent.modelConfig?.modelName ?? 'openai/gpt-4o',
        messages,
        temperature: agent.modelConfig?.temperature,
        maxTokens: agent.modelConfig?.maxTokens,
        topP: agent.modelConfig?.topP,
        frequencyPenalty: agent.modelConfig?.frequencyPenalty,
        presencePenalty: agent.modelConfig?.presencePenalty,
      });
      const reply = response.content?.trim() ?? '';
      await this.tracker.addStep(runId, {
        stepType: 'LLM_CALL',
        toolName: agent.modelConfig?.modelName ?? 'openai/gpt-4o',
        input: { messageCount: messages.length },
        output: { finishReason: response.finishReason, contentLength: reply.length },
        durationMs: Date.now() - started,
        iteration: 0,
      });

      if (!reply) {
        await this.tracker.failRun(runId, 'Resposta vazia do modelo');
        throw new BadGatewayException('Resposta vazia do modelo');
      }

      await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: reply,
      });
      await this.tracker.completeRun(runId, reply, 1, 0);
      return { conversationId: conversation.id, reply };
    } catch (error) {
      if (error instanceof BadGatewayException) {
        throw error;
      }
      const message = error instanceof Error ? error.message : String(error);
      await this.tracker.failRun(runId, message);
      throw new BadGatewayException('Falha ao gerar a resposta do agente');
    }
  }
}

function toPromptMessage(message: PlatformMessageData): ConversationMessageData {
  return {
    id: message.id,
    conversationId: message.conversationId,
    role: message.role,
    content: message.content,
    originalType: null,
    createdAt: message.createdAt,
  };
}
