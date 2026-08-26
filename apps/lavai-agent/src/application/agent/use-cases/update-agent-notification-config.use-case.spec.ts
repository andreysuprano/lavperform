import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateAgentNotificationConfigUseCase } from './update-agent-notification-config.use-case';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

describe('UpdateAgentNotificationConfigUseCase', () => {
  const repository = {
    findById: jest.fn(),
    updateNotificationConfig: jest.fn(),
  } as unknown as jest.Mocked<AgentRepositoryPort>;

  const useCase = new UpdateAgentNotificationConfigUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('normaliza e salva telefone com DDI', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);
    repository.updateNotificationConfig.mockResolvedValue({
      id: 'cfg-1',
      agentId: 'agent-1',
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await useCase.execute('agent-1', {
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
    });

    expect(repository.updateNotificationConfig).toHaveBeenCalledWith('agent-1', {
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      helpNotificationIgnoreReplies: true,
    });
  });

  it('prefixa 55 quando o número local tem 11 dígitos', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);
    repository.updateNotificationConfig.mockResolvedValue({
      id: 'cfg-1',
      agentId: 'agent-1',
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await useCase.execute('agent-1', {
      helpNotificationEnabled: true,
      helpNotificationPhone: '11999999999',
    });

    expect(repository.updateNotificationConfig).toHaveBeenCalledWith('agent-1', {
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      helpNotificationIgnoreReplies: true,
    });
  });

  it('normaliza enabled=false quando não há telefone', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);
    repository.updateNotificationConfig.mockResolvedValue({
      id: 'cfg-1',
      agentId: 'agent-1',
      helpNotificationEnabled: false,
      helpNotificationPhone: null,
      helpNotificationIgnoreReplies: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await useCase.execute('agent-1', { helpNotificationEnabled: true });

    expect(repository.updateNotificationConfig).toHaveBeenCalledWith('agent-1', {
      helpNotificationEnabled: false,
      helpNotificationPhone: null,
      helpNotificationIgnoreReplies: true,
    });
  });

  it('rejeita telefone inválido', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);

    await expect(
      useCase.execute('agent-1', {
        helpNotificationEnabled: true,
        helpNotificationPhone: '123',
      }),
    ).rejects.toBeInstanceOf(BadRequestException);

    expect(repository.updateNotificationConfig).not.toHaveBeenCalled();
  });

  it('retorna 404 quando agente não existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(
      useCase.execute('missing', { helpNotificationEnabled: false }),
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('grava ignore de respostas como true por padrão', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);
    repository.updateNotificationConfig.mockResolvedValue({
      id: 'cfg-1',
      agentId: 'agent-1',
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      helpNotificationIgnoreReplies: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await useCase.execute('agent-1', {
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
    });

    expect(repository.updateNotificationConfig).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ helpNotificationIgnoreReplies: true }),
    );
  });

  it('permite desligar o ignore de respostas', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
        helpNotificationIgnoreReplies: true,
      },
    } as never);
    repository.updateNotificationConfig.mockResolvedValue({
      id: 'cfg-1',
      agentId: 'agent-1',
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      helpNotificationIgnoreReplies: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await useCase.execute('agent-1', {
      helpNotificationIgnoreReplies: false,
    });

    expect(repository.updateNotificationConfig).toHaveBeenCalledWith(
      'agent-1',
      expect.objectContaining({ helpNotificationIgnoreReplies: false }),
    );
  });
});
