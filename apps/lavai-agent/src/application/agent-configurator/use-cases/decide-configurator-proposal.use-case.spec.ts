import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { DecideConfiguratorProposalUseCase } from './decide-configurator-proposal.use-case';

describe('DecideConfiguratorProposalUseCase', () => {
  const updatedAt = new Date('2026-11-27T12:00:00.000Z');
  const agents = {
    findByPlatformCode: jest.fn().mockResolvedValue({ id: 'configurator', active: true }),
    findById: jest.fn().mockResolvedValue({ id: 'public-1', persona: { updatedAt } }),
    updatePersona: jest.fn(),
  };
  const conversations = {
    findMessage: jest.fn(),
    updateProposalStatus: jest.fn(),
    addMessage: jest.fn(),
  };
  const useCase = new DecideConfiguratorProposalUseCase(
    agents as unknown as AgentRepositoryPort,
    conversations as unknown as PlatformConversationRepositoryPort,
  );

  it('grava somente o contexto de negócio, mesmo que a proposta traga outros campos', async () => {
    conversations.findMessage.mockResolvedValue({
      id: 'msg-1',
      proposalStatus: 'pending',
      blocksJson: JSON.stringify([
        {
          type: 'proposal',
          behavior: 'x',
          baseUpdatedAt: updatedAt.toISOString(),
          changes: [{ before: '', after: 'novo' }],
          document: { contextPrompt: 'contexto novo', systemPrompt: 'outro foco', guardrails: 'outros' },
        },
      ]),
      conversation: {
        id: 'conv-1',
        agentId: 'configurator',
        contextCompanyId: 'company-1',
        platformUserId: 'user-1',
        targetAgentId: 'public-1',
      },
    });

    await useCase.execute({
      messageId: 'msg-1',
      action: 'accept',
      contextCompanyId: 'company-1',
      platformUserId: 'user-1',
      targetAgentId: 'public-1',
    });

    expect(agents.updatePersona).toHaveBeenCalledWith('public-1', { contextPrompt: 'contexto novo' });
  });
});
