import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';
import { JourneyOrchestratorService } from '../../customer-journey/services/journey-orchestrator.service';
import {
  CONVERSATION_REPOSITORY,
  MessageRole,
} from '../../webhook/ports/conversation.repository.port';
import type {
  ConversationMessageData,
  ConversationRepositoryPort,
} from '../../webhook/ports/conversation.repository.port';
import {
  isPlaygroundSessionId,
  PLAYGROUND_CHAT_PREFIX,
  PLAYGROUND_FAILED,
  PLAYGROUND_HANDOFF,
  PLAYGROUND_PHONE,
  PLAYGROUND_UNAVAILABLE,
} from '../playground-conversation';

export interface PlaygroundHistoryMessage {
  role?: string;
  content?: string;
}

export interface RunPlaygroundTurnInput {
  contextCompanyId: string;
  platformUserId: string;
  userName: string;
  targetAgentId: string;
  sessionId: string;
  content: string;
  history: PlaygroundHistoryMessage[];
}

@Injectable()
export class RunPlaygroundTurnUseCase {
  private readonly logger = new Logger(RunPlaygroundTurnUseCase.name);

  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(CONVERSATION_REPOSITORY) private readonly conversations: ConversationRepositoryPort,
    private readonly journey: JourneyOrchestratorService,
    private readonly runner: AgentRunnerService,
  ) {}

  async execute(input: RunPlaygroundTurnInput): Promise<{ content: string }> {
    const content = input.content?.trim() ?? '';
    if (!isPlaygroundSessionId(input.sessionId) || content === '') {
      throw new BadRequestException(PLAYGROUND_FAILED);
    }

    const agent = await this.agents.findById(input.targetAgentId);
    if (!agent || agent.kind !== AgentKind.PUBLIC || agent.companyId !== input.contextCompanyId) {
      throw new NotFoundException(PLAYGROUND_UNAVAILABLE);
    }

    const instanceToken = await this.conversations.findLatestInstanceToken(agent.id);
    const chatId = `${PLAYGROUND_CHAT_PREFIX}${input.sessionId}`;
    const conversation = await this.conversations.upsert({
      agentId: agent.id,
      companyId: agent.companyId,
      chatId,
      userId: input.platformUserId,
      userPhone: PLAYGROUND_PHONE,
      userName: input.userName,
      isGroup: false,
      instanceName: agent.instanceName?.trim() || PLAYGROUND_PHONE,
      instanceToken: instanceToken?.trim() || PLAYGROUND_PHONE,
    });

    const journey = await this.journey.onInboundMessage({
      agent,
      conversation,
      message: content,
    });
    if (journey.skipLlm) {
      return { content: PLAYGROUND_HANDOFF };
    }

    const windowSize = agent.memoryConfig?.windowSize ?? 10;
    try {
      const answer = await this.runner.complete({
        agent,
        conversation,
        history: this.history(input.history, windowSize, conversation.id),
        userMessage: content,
        sender: {
          senderName: input.userName,
          senderPhone: PLAYGROUND_PHONE,
          chatId,
          isGroup: false,
        },
      });
      if (!answer.trim()) {
        throw new BadGatewayException(PLAYGROUND_FAILED);
      }
      return { content: this.withSignature(answer, agent.persona?.messageSignature) };
    } catch (error) {
      if (error instanceof HttpException) throw error;
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Turno de teste falhou | agent=${agent.id} | ${message}`);
      throw new BadGatewayException(PLAYGROUND_FAILED);
    }
  }

  private history(
    history: PlaygroundHistoryMessage[],
    windowSize: number,
    conversationId: string,
  ): ConversationMessageData[] {
    return history
      .filter(
        (message) =>
          (message.role === 'user' || message.role === 'assistant') &&
          typeof message.content === 'string',
      )
      .slice(-windowSize)
      .map((message, index) => ({
        id: `playground-history-${index}`,
        conversationId,
        role: message.role === 'user' ? MessageRole.USER : MessageRole.ASSISTANT,
        content: message.content ?? '',
        originalType: 'TEXT',
        createdAt: new Date(0),
      }));
  }

  private withSignature(answer: string, signature: string | null | undefined): string {
    const trimmed = signature?.trim() ?? '';
    if (!trimmed) return answer;
    return `${answer}\n\n${trimmed}`;
  }
}
