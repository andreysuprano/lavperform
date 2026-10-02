import { AgentKind } from '../ports/agent.repository.port';
import { CreateAgentUseCase } from './create-agent.use-case';

describe('CreateAgentUseCase', () => {
  it('cria o agente público mesmo se o input pedir outro tipo', async () => {
    const repository = { create: jest.fn().mockResolvedValue({ id: 'agent-1' }) };
    const useCase = new CreateAgentUseCase(repository as never);

    await useCase.execute({
      companyId: 'company-1',
      name: 'WhatsApp',
      kind: AgentKind.INTERNAL,
    });

    expect(repository.create).toHaveBeenCalledWith({
      companyId: 'company-1',
      name: 'WhatsApp',
      kind: AgentKind.PUBLIC,
    });
  });
});
