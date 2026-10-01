import { BadGatewayException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { PlatformAgentService } from './platform-agent.service';

describe('PlatformAgentService', () => {
  const prisma = {
    userCompany: { findUnique: jest.fn() },
    user: { findUnique: jest.fn() },
    company: { findUnique: jest.fn() },
  };
  const lavai = {
    listPlatformAgents: jest.fn(),
    getPlatformAgent: jest.fn(),
    runPlatformTurn: jest.fn(),
    listPlatformTurns: jest.fn(),
  };

  const service = new PlatformAgentService(prisma as never, lavai as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('lista só agentes ativos e só os campos do catálogo', async () => {
    lavai.listPlatformAgents.mockResolvedValue([
      {
        id: 'a1',
        name: 'Relatórios',
        description: 'Ajuda',
        active: true,
        persona: { personaName: 'Lavi', welcomeMessage: 'Olá', systemPrompt: 'segredo' },
      },
      { id: 'a2', name: 'Inativo', description: null, active: false, persona: null },
    ]);

    await expect(service.list()).resolves.toEqual([
      {
        id: 'a1',
        name: 'Relatórios',
        description: 'Ajuda',
        personaName: 'Lavi',
        welcomeMessage: 'Olá',
      },
    ]);
  });

  it('responde 404 para agente inativo', async () => {
    lavai.getPlatformAgent.mockResolvedValue({
      id: 'a2',
      name: 'Inativo',
      description: null,
      active: false,
      persona: null,
    });

    await expect(service.get('a2')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('responde 403 quando o usuário não pertence à empresa', async () => {
    prisma.userCompany.findUnique.mockResolvedValue(null);

    await expect(service.turn('user-1', 'agent-1', 'company-1', 'Oi')).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(lavai.runPlatformTurn).not.toHaveBeenCalled();
  });

  it('devolve a resposta do turno no contexto da empresa selecionada', async () => {
    prisma.userCompany.findUnique.mockResolvedValue({ id: 'link' });
    prisma.user.findUnique.mockResolvedValue({ name: 'Ana' });
    prisma.company.findUnique.mockResolvedValue({ name: 'Lavanderia Centro' });
    lavai.runPlatformTurn.mockResolvedValue({ conversationId: 'conv-1', reply: 'Olá' });

    await expect(service.turn('user-1', 'agent-1', 'company-1', 'Oi')).resolves.toEqual({
      conversationId: 'conv-1',
      reply: 'Olá',
    });
    expect(lavai.runPlatformTurn).toHaveBeenCalledWith('agent-1', {
      contextCompanyId: 'company-1',
      platformUserId: 'user-1',
      userName: 'Ana',
      companyName: 'Lavanderia Centro',
      text: 'Oi',
    });
  });

  it('propaga a falha do modelo', async () => {
    prisma.userCompany.findUnique.mockResolvedValue({ id: 'link' });
    prisma.user.findUnique.mockResolvedValue({ name: 'Ana' });
    prisma.company.findUnique.mockResolvedValue({ name: 'Lavanderia Centro' });
    lavai.runPlatformTurn.mockRejectedValue(new BadGatewayException('Resposta vazia do modelo'));

    await expect(service.turn('user-1', 'agent-1', 'company-1', 'Oi')).rejects.toBeInstanceOf(
      BadGatewayException,
    );
  });

  it('devolve histórico vazio quando ainda não houve conversa', async () => {
    prisma.userCompany.findUnique.mockResolvedValue({ id: 'link' });
    lavai.listPlatformTurns.mockResolvedValue({ conversationId: null, messages: [] });

    await expect(service.listTurns('user-1', 'agent-1', 'company-1')).resolves.toEqual({
      conversationId: null,
      messages: [],
    });
  });
});
