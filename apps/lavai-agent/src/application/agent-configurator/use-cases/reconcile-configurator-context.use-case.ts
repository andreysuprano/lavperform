import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { applyContextEdits } from '../context-edits';
import { CONFIGURATOR_CODE, type StoredBlock } from '../configurator-blocks';
import { tryDirectContextInstruction } from '../direct-context-instruction';

export type ReconcileResult = {
  targetAgentId: string;
  contextCompanyId: string;
  conversations: number;
  appliedDirectInstructions: number;
  appliedPendingProposals: number;
  contextChanged: boolean;
};

/**
 * Reaplica no agente o que foi dito no configurador e ainda não entrou no contextPrompt:
 * instruções "deve ser:", propostas pendentes, em ordem cronológica.
 */
@Injectable()
export class ReconcileConfiguratorContextUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
  ) {}

  async execute(input: {
    contextCompanyId: string;
    targetAgentId: string;
  }): Promise<ReconcileResult> {
    const configurator = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
    if (!configurator) {
      throw new NotFoundException('O configurador não está disponível.');
    }
    const target = await this.agents.findById(input.targetAgentId);
    if (!target || target.kind !== AgentKind.PUBLIC || !target.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const conversationRows = await this.conversations.listByTarget(
      configurator.id,
      input.contextCompanyId,
      input.targetAgentId,
    );
    if (conversationRows.length === 0) {
      return {
        targetAgentId: input.targetAgentId,
        contextCompanyId: input.contextCompanyId,
        conversations: 0,
        appliedDirectInstructions: 0,
        appliedPendingProposals: 0,
        contextChanged: false,
      };
    }

    let context = target.persona.contextPrompt ?? '';
    let appliedDirectInstructions = 0;
    let appliedPendingProposals = 0;
    const startContext = context;

    for (const conversation of conversationRows) {
      const messages = await this.conversations.listMessagesAscending(conversation.id);
      for (const message of messages) {
        if (message.role === MessageRole.USER) {
          const direct = tryDirectContextInstruction(message.content, context);
          if (direct?.writesContext) {
            const merged = applyContextEdits(context, {
              replacements: direct.replacements,
              addition: direct.addition,
            });
            if (merged.ok) {
              context = merged.context;
              appliedDirectInstructions += 1;
            }
          }
          continue;
        }
        if (message.role !== MessageRole.ASSISTANT || message.proposalStatus !== 'pending' || !message.blocksJson) {
          continue;
        }
        const blocks = JSON.parse(message.blocksJson) as StoredBlock[];
        const proposal = blocks.find((block) => block.type === 'proposal');
        if (proposal?.type !== 'proposal' || !proposal.document?.contextPrompt) continue;
        context = proposal.document.contextPrompt;
        appliedPendingProposals += 1;
        await this.conversations.updateProposalStatus(message.id, 'accepted');
      }
    }

    const contextChanged = context !== startContext;
    if (contextChanged) {
      await this.agents.updatePersona(target.id, { contextPrompt: context });
    }

    return {
      targetAgentId: input.targetAgentId,
      contextCompanyId: input.contextCompanyId,
      conversations: conversationRows.length,
      appliedDirectInstructions,
      appliedPendingProposals,
      contextChanged,
    };
  }
}