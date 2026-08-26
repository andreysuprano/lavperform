import { BadRequestException, NotFoundException } from '@nestjs/common';
import { UpdateAgentJourneyConfigUseCase } from './update-agent-journey-config.use-case';
import type { AgentRepositoryPort } from '../ports/agent.repository.port';

describe('UpdateAgentJourneyConfigUseCase', () => {
  const repository = {
    findById: jest.fn(),
    updateJourneyConfig: jest.fn(),
  } as unknown as jest.Mocked<AgentRepositoryPort>;

  const useCase = new UpdateAgentJourneyConfigUseCase(repository);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.updateJourneyConfig.mockResolvedValue({
      id: 'jc-1',
      agentId: 'agent-1',
      enabled: true,
    } as never);
  });

  it('recusa habilitar jornada sem telefone de notificação', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);

    await expect(useCase.execute('agent-1', { enabled: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(repository.updateJourneyConfig).not.toHaveBeenCalled();
  });

  it('recusa habilitar jornada com telefone mas notificação desligada', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: {
        helpNotificationEnabled: false,
        helpNotificationPhone: '5511999999999',
      },
    } as never);

    await expect(useCase.execute('agent-1', { enabled: true })).rejects.toBeInstanceOf(
      BadRequestException,
    );

    expect(repository.updateJourneyConfig).not.toHaveBeenCalled();
  });

  it('habilita jornada quando notificação tem telefone e está ligada', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
      },
    } as never);

    await useCase.execute('agent-1', { enabled: true });

    expect(repository.updateJourneyConfig).toHaveBeenCalledWith('agent-1', { enabled: true });
  });

  it('permite desabilitar jornada sem telefone', async () => {
    repository.findById.mockResolvedValue({
      id: 'agent-1',
      notificationConfig: null,
    } as never);

    await useCase.execute('agent-1', { enabled: false });

    expect(repository.updateJourneyConfig).toHaveBeenCalledWith('agent-1', { enabled: false });
  });

  it('retorna 404 quando agente não existe', async () => {
    repository.findById.mockResolvedValue(null);

    await expect(useCase.execute('missing', { enabled: true })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });
});
