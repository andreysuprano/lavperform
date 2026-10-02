import { AgentKind } from '../../agent/ports/agent.repository.port';
import { ProcessWebhookJobUseCase } from './process-webhook-job.use-case';

describe('ProcessWebhookJobUseCase', () => {
  it('não seleciona agente interno', async () => {
    const repository = {
      markAsProcessing: jest.fn(),
      findById: jest.fn().mockResolvedValue({ id: 'evt-1', companyId: 'company-1', rawPayload: '{}' }),
      markAsCompleted: jest.fn(),
      markAsFailed: jest.fn(),
    };
    const textHandler = { handle: jest.fn() };
    const provider = { parse: jest.fn() };
    const useCase = new ProcessWebhookJobUseCase(
      repository as never,
      provider as never,
      { findById: jest.fn().mockResolvedValue({ id: 'agent-1', active: true, kind: AgentKind.INTERNAL }) } as never,
      textHandler as never,
      { handle: jest.fn() } as never,
      { handle: jest.fn() } as never,
      { handle: jest.fn() } as never,
    );

    await useCase.execute('evt-1', 'agent-1');

    expect(textHandler.handle).not.toHaveBeenCalled();
    expect(provider.parse).not.toHaveBeenCalled();
    expect(repository.markAsCompleted).toHaveBeenCalledWith('evt-1');
  });
});
