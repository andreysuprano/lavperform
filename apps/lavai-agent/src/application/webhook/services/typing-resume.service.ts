import { Inject, Injectable, Logger } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';
import { CONVERSATION_REPOSITORY, MessageRole } from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import { MessageType } from '../types/incoming-message.types';
import type { NormalizedAgentPrompt } from '../types/normalized-agent-prompt.types';
import { HumanTakeoverService } from './human-takeover.service';
import { HumanTypingPauseService } from './human-typing-pause.service';

const RECENT_MESSAGES_LIMIT = 20;
const AUTOMATIC_MESSAGE_TYPES = new Set(['WAITING_ACK', 'FOLLOW_UP', 'IDLE_CLOSE']);

/**
 * Retoma a resposta que ficou retida durante a pausa de digitação do atendente,
 * quando o buffer já foi consumido e só restou o marcador pendente.
 */
@Injectable()
export class TypingResumeService {
  private readonly logger = new Logger(TypingResumeService.name);

  constructor(
    private readonly typing: HumanTypingPauseService,
    private readonly takeover: HumanTakeoverService,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
    private readonly agentRunner: AgentRunnerService,
  ) {}

  async resume(agentId: string, chatId: string): Promise<void> {
    const conversationId = await this.typing.getPending(agentId, chatId);
    if (!conversationId) return;

    if (await this.typing.isPaused(agentId, chatId)) return;
    if (await this.takeover.isInTakeover(agentId, chatId)) return;

    const conversation = await this.conversations.findById(conversationId);
    if (!conversation) {
      await this.typing.clearPending(agentId, chatId);
      return;
    }

    const recent = await this.conversations.findRecentMessages(
      conversation.id,
      RECENT_MESSAGES_LIMIT,
    );
    const last = [...recent]
      .reverse()
      .find((message) => !AUTOMATIC_MESSAGE_TYPES.has(message.originalType ?? ''));

    if (!last || last.role !== MessageRole.USER) {
      await this.typing.clearPending(agentId, chatId);
      return;
    }

    const agent = await this.agents.findById(agentId);
    if (!agent) {
      await this.typing.clearPending(agentId, chatId);
      return;
    }

    const prompt: NormalizedAgentPrompt = {
      userMessage: last.content,
      triggerText: last.content,
      originalMessageType: MessageType.TEXT,
      context: {
        webhookEventId: 'typing-resume',
        companyId: conversation.companyId,
        agentId,
        senderPhone: conversation.userPhone,
        senderName: conversation.userName,
        chatId: conversation.chatId,
        instanceName: conversation.instanceName,
        timestamp: Date.now(),
        isGroup: conversation.isGroup,
        groupName: conversation.groupName ?? undefined,
      },
    };

    this.logger.log(
      `[TypingResume] Retomando resposta | agentId=${agentId} | chatId=${chatId} | conv=${conversation.id}`,
    );
    await this.agentRunner.run(prompt, conversation, agent);
  }
}
