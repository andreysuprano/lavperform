import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../ports/platform-conversation.repository.port';
import type {
  PlatformConversationRepositoryPort,
  PlatformMessageData,
} from '../ports/platform-conversation.repository.port';

export interface ListPlatformTurnsInput {
  contextCompanyId: string;
  platformUserId: string;
  limit: number;
}

@Injectable()
export class ListPlatformTurnsUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
  ) {}

  async execute(agentId: string, input: ListPlatformTurnsInput): Promise<{
    conversationId: string | null;
    messages: Array<Pick<PlatformMessageData, 'id' | 'role' | 'content' | 'createdAt'>>;
  }> {
    if (!Number.isInteger(input.limit) || input.limit < 1 || input.limit > 100) {
      throw new BadRequestException('limit deve ser um inteiro entre 1 e 100');
    }

    const agent = await this.agents.findById(agentId);
    if (!agent || agent.kind !== AgentKind.INTERNAL || !agent.active) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const conversation = await this.conversations.findByTrio(
      agent.id,
      input.contextCompanyId,
      input.platformUserId,
    );
    if (!conversation) {
      return { conversationId: null, messages: [] };
    }

    const messages = await this.conversations.listLatestMessages(conversation.id, input.limit);
    return {
      conversationId: conversation.id,
      messages: messages.map(({ id, role, content, createdAt }) => ({
        id,
        role,
        content,
        createdAt,
      })),
    };
  }
}
