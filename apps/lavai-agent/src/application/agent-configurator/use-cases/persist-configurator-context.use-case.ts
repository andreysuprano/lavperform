import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AGENT_REPOSITORY, AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../platform-agent/ports/platform-conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import { CONFIGURATOR_CODE, joinedMarkdown, type StoredBlock } from '../configurator-blocks';
import { applyContextEdits } from '../context-edits';
import { tryManualContextPersist } from '../direct-context-instruction';

export type PersistConfiguratorContextResult = {
  contextChanged: boolean;
  message: string;
};

@Injectable()
export class PersistConfiguratorContextUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY) private readonly agents: AgentRepositoryPort,
    @Inject(PLATFORM_CONVERSATION_REPOSITORY)
    private readonly conversations: PlatformConversationRepositoryPort,
  ) {}

  async execute(input: {
    contextCompanyId: string;
    platformUserId: string;
    targetAgentId: string;
    text: string;
    recordInChat?: boolean;
  }): Promise<PersistConfiguratorContextResult> {
    const configurator = await this.agents.findByPlatformCode(CONFIGURATOR_CODE);
    if (!configurator) {
      throw new NotFoundException('O configurador não está disponível.');
    }
    const target = await this.agents.findById(input.targetAgentId);
    if (!target || target.kind !== AgentKind.PUBLIC || !target.persona) {
      throw new NotFoundException('Agente não encontrado.');
    }

    const manual = tryManualContextPersist(input.text, target.persona.contextPrompt ?? '');
    if (!manual) {
      throw new BadRequestException('Escreva um pouco mais de texto para gravar.');
    }

    let contextChanged = false;
    if (manual.writesContext) {
      const merged = applyContextEdits(target.persona.contextPrompt ?? '', {
        replacements: manual.replacements,
        addition: manual.addition,
      });
      if (!merged.ok) {
        throw new BadRequestException(merged.reason);
      }
      await this.agents.updatePersona(target.id, { contextPrompt: merged.context });
      contextChanged = true;
    }

    const confirmation = manual.confirmationMessage;

    if (input.recordInChat !== false) {
      const conversation = await this.conversations.upsert({
        agentId: configurator.id,
        contextCompanyId: input.contextCompanyId,
        platformUserId: input.platformUserId,
        targetAgentId: input.targetAgentId,
      });
      const stored: StoredBlock[] = [{ type: 'markdown', content: confirmation }];
      await this.conversations.addMessage({
        conversationId: conversation.id,
        role: MessageRole.ASSISTANT,
        content: joinedMarkdown(stored),
        blocksJson: JSON.stringify(stored),
        proposalStatus: null,
      });
    }

    return { contextChanged, message: confirmation };
  }
}