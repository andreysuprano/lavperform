import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { ReconcileAllConfiguratorContextsUseCase } from './reconcile-all-configurator-contexts.use-case';
import { ReconcileConfiguratorContextUseCase } from './reconcile-configurator-context.use-case';

describe('ReconcileAllConfiguratorContextsUseCase', () => {
  const agents = {
    findByPlatformCode: jest.fn(),
  } as unknown as jest.Mocked<Pick<AgentRepositoryPort, 'findByPlatformCode'>>;

  const conversations = {
    listDistinctConfiguratorTargets: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<PlatformConversationRepositoryPort, 'listDistinctConfiguratorTargets'>
  >;

  const reconcileOne = {
    execute: jest.fn(),
  } as unknown as jest.Mocked<Pick<ReconcileConfiguratorContextUseCase, 'execute'>>;

  const useCase = new ReconcileAllConfiguratorContextsUseCase(
    agents as unknown as AgentRepositoryPort,
    conversations as unknown as PlatformConversationRepositoryPort,
    reconcileOne as unknown as ReconcileConfiguratorContextUseCase,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    agents.findByPlatformCode.mockResolvedValue({ id: 'cfg-1' } as never);
  });

  it('reconcilia cada par distinto e agrega falhas', async () => {
    conversations.listDistinctConfiguratorTargets.mockResolvedValue([
      { contextCompanyId: 'co-1', targetAgentId: 'a-1' },
      { contextCompanyId: 'co-2', targetAgentId: 'a-2' },
    ]);
    reconcileOne.execute
      .mockResolvedValueOnce({
        targetAgentId: 'a-1',
        contextCompanyId: 'co-1',
        conversations: 1,
        appliedDirectInstructions: 1,
        appliedPendingProposals: 0,
        contextChanged: true,
      })
      .mockRejectedValueOnce(new Error('agente ausente'));

    const summary = await useCase.execute();

    expect(summary.targets).toBe(2);
    expect(summary.changed).toBe(1);
    expect(summary.failures).toHaveLength(1);
    expect(reconcileOne.execute).toHaveBeenCalledTimes(2);
  });
});