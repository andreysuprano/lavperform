import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import {
  CONFIGURATOR_CODE,
  decideProposal,
  type ProposalStatus,
  type StoredBlock,
} from '../configurator-blocks';

@Injectable()
export class DecideConfiguratorProposalUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
  ) {}

  async execute(input: {
    messageId: string;
    action: 'accept' | 'reject';
    contextCompanyId: string;
    platformUserId: string;
    targetAgentId: string;
  }): Promise<{ status: ProposalStatus; message?: string }> {
    const configurator = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
    if (!configurator || !configurator.active) {
      throw new NotFoundException('O configurador não está disponível.');
    }
    const message = await this.conversations.findMessage(input.messageId);
    const conversation = message?.conversation;
    if (
      !message ||
      !conversation ||
      conversation.agentId !== configurator.id ||
      conversation.contextCompanyId !== input.contextCompanyId ||
      conversation.platformUserId !== input.platformUserId ||
      conversation.targetAgentId !== input.targetAgentId
    ) {
      throw new NotFoundException('Proposta não encontrada.');
    }

    const blocks = JSON.parse(message.blocksJson ?? '[]') as StoredBlock[];
    const proposal = blocks.find((block) => block.type === 'proposal');
    if (!proposal || proposal.type !== 'proposal') {
      throw new NotFoundException('Proposta não encontrada.');
    }
    const target = await this.agents.findById(input.targetAgentId);
    if (!target?.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const decision = decideProposal({
      status: (message.proposalStatus as ProposalStatus | null) ?? null,
      baseUpdatedAt: proposal.baseUpdatedAt,
      currentUpdatedAt: target.persona.updatedAt.toISOString(),
      document: proposal.document,
      action: input.action,
    });

    if (!decision.changed) {
      return { status: (message.proposalStatus as ProposalStatus) ?? decision.nextStatus };
    }

    if (decision.writeDocument) {
      await this.agents.updatePersona(target.id, proposal.document);
    }
    await this.conversations.updateProposalStatus(message.id, decision.nextStatus);
    if (decision.message) {
      await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: decision.message,
        blocksJson: JSON.stringify([{ type: 'markdown', content: decision.message }]),
      });
    }
    return { status: decision.nextStatus, message: decision.message };
  }
}
