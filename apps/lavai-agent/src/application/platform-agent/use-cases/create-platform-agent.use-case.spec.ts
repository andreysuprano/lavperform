import { BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { CreatePlatformAgentUseCase } from './create-platform-agent.use-case';
import type { PlatformCompanyPort } from '../ports/platform-company.port';

describe('CreatePlatformAgentUseCase', () => {
  const agents = {
    create: jest.fn().mockResolvedValue({ id: 'agent-1', kind: AgentKind.INTERNAL }),
  } as unknown as jest.Mocked<AgentRepositoryPort>;
  const platformCompany: jest.Mocked<PlatformCompanyPort> = {
    getId: jest.fn().mockResolvedValue('platform-company'),
  };

  const useCase = new CreatePlatformAgentUseCase(agents, platformCompany);

  beforeEach(() => {
    jest.clearAllMocks();
    platformCompany.getId.mockResolvedValue('platform-company');
  });

  it('grava o agente como interno na empresa plataforma', async () => {
    await useCase.execute({ name: 'Relatórios' });

    expect(agents.create).toHaveBeenCalledWith({
      name: 'Relatórios',
      companyId: 'platform-company',
      kind: AgentKind.INTERNAL,
      instanceName: undefined,
    });
  });

  it('recusa instanceName', async () => {
    await expect(
      useCase.execute({ name: 'Relatórios', instanceName: 'whatsapp-1' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(agents.create).not.toHaveBeenCalled();
  });

  it('falha quando a empresa plataforma não existe', async () => {
    platformCompany.getId.mockRejectedValue(
      new InternalServerErrorException('Empresa plataforma ausente no motor: lavperform-platform'),
    );

    await expect(useCase.execute({ name: 'Relatórios' })).rejects.toBeInstanceOf(
      InternalServerErrorException,
    );
  });
});
