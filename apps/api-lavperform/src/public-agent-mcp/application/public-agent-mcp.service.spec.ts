import {
  BadRequestException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { PublicAgentMcpService } from './public-agent-mcp.service';

const COMPANY_ID = '11111111-1111-4111-8111-111111111111';
const MOTOR_COMPANY_ID = '22222222-2222-4222-8222-222222222222';
const AGENT_ID = '33333333-3333-4333-8333-333333333333';

const persona = {
  personaName: 'Aria',
  personaDescription: 'Atendimento',
  systemPrompt: 'Você é a Aria.',
  behaviorGuidelines: 'Seja clara.',
  guardrails: 'Não invente preço.',
  contextPrompt: 'Lavanderia.',
  welcomeMessage: 'Olá',
  messageSignature: 'Aria',
  voiceTone: 'PROFESSIONAL',
  communicationStyle: 'BALANCED',
  language: 'PT_BR',
};

function agent(overrides: Record<string, unknown> = {}) {
  return {
    id: AGENT_ID,
    companyId: MOTOR_COMPANY_ID,
    name: 'Recepção',
    description: 'WhatsApp',
    active: true,
    kind: 'PUBLIC',
    instanceName: 'secreta',
    persona,
    ...overrides,
  };
}

describe('PublicAgentMcpService', () => {
  const prisma = { company: { findUnique: jest.fn() } };
  const lavai = {
    listAgents: jest.fn(),
    getAgent: jest.fn(),
    updatePersona: jest.fn(),
  };
  const config = { get: jest.fn() };
  const service = new PublicAgentMcpService(
    prisma as never,
    lavai as never,
    config as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    config.get.mockReturnValue('chave-certa');
    prisma.company.findUnique.mockResolvedValue({
      overAgentCompanyId: MOTOR_COMPANY_ID,
    });
  });

  describe('abertura da sessão', () => {
    it('responde 401 e registra no log quando a chave não está no ambiente', async () => {
      config.get.mockReturnValue(undefined);
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);

      await expect(
        service.openSession(undefined, COMPANY_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      expect(error).toHaveBeenCalledWith(
        expect.stringContaining('MCP_PUBLIC_AGENTS_API_KEY'),
      );
      expect(prisma.company.findUnique).not.toHaveBeenCalled();
      error.mockRestore();
    });

    it('responde 401 quando a chave da requisição não confere', async () => {
      await expect(
        service.openSession('outra', COMPANY_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(
        service.openSession(undefined, COMPANY_ID),
      ).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('responde 400 quando a empresa não é um UUID', async () => {
      await expect(
        service.openSession('chave-certa', 'empresa'),
      ).rejects.toBeInstanceOf(BadRequestException);
      await expect(
        service.openSession('chave-certa', undefined),
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('responde 404 quando a empresa não existe ou não está provisionada', async () => {
      prisma.company.findUnique.mockResolvedValueOnce(null);
      await expect(
        service.openSession('chave-certa', COMPANY_ID),
      ).rejects.toBeInstanceOf(NotFoundException);

      prisma.company.findUnique.mockResolvedValueOnce({
        overAgentCompanyId: null,
      });
      await expect(
        service.openSession('chave-certa', COMPANY_ID),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('fixa a empresa do Lavperform e a do motor', async () => {
      await expect(
        service.openSession('chave-certa', COMPANY_ID),
      ).resolves.toEqual({
        lavperformCompanyId: COMPANY_ID,
        overAgentCompanyId: MOTOR_COMPANY_ID,
      });
      expect(prisma.company.findUnique).toHaveBeenCalledWith({
        where: { id: COMPANY_ID },
        select: { overAgentCompanyId: true },
      });
    });

    it('responde 400 quando o POST traz outra empresa', async () => {
      const session = await service.openSession('chave-certa', COMPANY_ID);

      expect(() => service.assertSameCompany(session, undefined)).not.toThrow();
      expect(() =>
        service.assertSameCompany(session, COMPANY_ID),
      ).not.toThrow();
      expect(() =>
        service.assertSameCompany(session, MOTOR_COMPANY_ID),
      ).toThrow(BadRequestException);
    });
  });

  describe('ferramentas', () => {
    async function session() {
      return service.openSession('chave-certa', COMPANY_ID);
    }

    it('lista só os quatro campos dos agentes que o motor devolveu', async () => {
      lavai.listAgents.mockResolvedValue([
        agent(),
        agent({
          id: '44444444-4444-4444-8444-444444444444',
          name: 'Inativo',
          description: null,
          active: false,
        }),
      ]);

      await expect(service.list(await session())).resolves.toEqual({
        ok: true,
        data: [
          {
            id: AGENT_ID,
            name: 'Recepção',
            description: 'WhatsApp',
            active: true,
          },
          {
            id: '44444444-4444-4444-8444-444444444444',
            name: 'Inativo',
            description: null,
            active: false,
          },
        ],
      });
      expect(lavai.listAgents).toHaveBeenCalledWith(MOTOR_COMPANY_ID);
    });

    it('devolve lista vazia', async () => {
      lavai.listAgents.mockResolvedValue([]);

      await expect(service.list(await session())).resolves.toEqual({
        ok: true,
        data: [],
      });
    });

    it('lê a persona gravada e omite dados que não são da persona', async () => {
      lavai.getAgent.mockResolvedValue(agent());

      await expect(
        service.getPersona(await session(), AGENT_ID),
      ).resolves.toEqual({
        ok: true,
        data: {
          id: AGENT_ID,
          name: 'Recepção',
          description: 'WhatsApp',
          active: true,
          persona,
        },
      });
    });

    it('lê agente sem persona', async () => {
      lavai.getAgent.mockResolvedValue(agent({ persona: null }));

      const result = await service.getPersona(await session(), AGENT_ID);

      expect(result).toEqual({
        ok: true,
        data: {
          id: AGENT_ID,
          name: 'Recepção',
          description: 'WhatsApp',
          active: true,
          persona: null,
        },
      });
    });

    it('atualiza só os campos enviados e devolve a persona gravada', async () => {
      lavai.getAgent.mockResolvedValue(agent());
      lavai.updatePersona.mockResolvedValue({
        ...persona,
        guardrails: 'Novo limite.',
      });

      await expect(
        service.updatePersona(await session(), AGENT_ID, {
          guardrails: '  Novo limite.  ',
        }),
      ).resolves.toEqual({
        ok: true,
        data: {
          id: AGENT_ID,
          name: 'Recepção',
          description: 'WhatsApp',
          active: true,
          persona: { ...persona, guardrails: 'Novo limite.' },
        },
      });
      expect(lavai.updatePersona).toHaveBeenCalledWith(AGENT_ID, {
        guardrails: 'Novo limite.',
      });
    });

    it('grava string vazia no campo opcional e não envia campo omitido', async () => {
      lavai.getAgent.mockResolvedValue(agent());
      lavai.updatePersona.mockResolvedValue({ ...persona, guardrails: '' });

      await service.updatePersona(await session(), AGENT_ID, {
        guardrails: '   ',
      });

      expect(lavai.updatePersona).toHaveBeenCalledWith(AGENT_ID, {
        guardrails: '',
      });
    });

    it('recusa atualização sem campo', async () => {
      lavai.getAgent.mockResolvedValue(agent());

      await expect(
        service.updatePersona(await session(), AGENT_ID, {}),
      ).resolves.toEqual({
        ok: false,
        message: 'Informe ao menos um campo da persona.',
      });
      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('recusa nome ou prompt em branco antes de gravar', async () => {
      lavai.getAgent.mockResolvedValue(agent());

      await expect(
        service.updatePersona(await session(), AGENT_ID, {
          systemPrompt: '   ',
        }),
      ).resolves.toEqual({
        ok: false,
        message:
          'Nome da persona e prompt de sistema não podem ficar em branco.',
      });
      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('recusa a primeira persona sem nome e prompt', async () => {
      lavai.getAgent.mockResolvedValue(agent({ persona: null }));

      await expect(
        service.updatePersona(await session(), AGENT_ID, {
          guardrails: 'Não invente.',
        }),
      ).resolves.toEqual({
        ok: false,
        message: 'A primeira persona precisa de nome e prompt de sistema.',
      });
      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('cria a primeira persona quando nome e prompt vêm juntos', async () => {
      lavai.getAgent.mockResolvedValue(agent({ persona: null }));
      const created = {
        ...persona,
        personaName: 'Nova',
        systemPrompt: 'Prompt novo',
      };
      lavai.updatePersona.mockResolvedValue(created);

      await expect(
        service.updatePersona(await session(), AGENT_ID, {
          personaName: 'Nova',
          systemPrompt: 'Prompt novo',
        }),
      ).resolves.toEqual({
        ok: true,
        data: {
          id: AGENT_ID,
          name: 'Recepção',
          description: 'WhatsApp',
          active: true,
          persona: created,
        },
      });
    });

    it('recusa texto acima de 32000 caracteres antes dos outros erros de campo', async () => {
      lavai.getAgent.mockResolvedValue(agent());

      await expect(
        service.updatePersona(await session(), AGENT_ID, {
          guardrails: 'a'.repeat(32001),
          systemPrompt: '   ',
        }),
      ).resolves.toEqual({
        ok: false,
        message: 'Cada texto da persona pode ter no máximo 32000 caracteres.',
      });
      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('recusa tom, estilo ou idioma fora da lista', async () => {
      lavai.getAgent.mockResolvedValue(agent());

      await expect(
        service.updatePersona(await session(), AGENT_ID, { voiceTone: '' }),
      ).resolves.toEqual({
        ok: false,
        message: 'Tom, estilo ou idioma fora dos valores aceitos.',
      });
      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('responde agente não encontrado sem chamar a gravação', async () => {
      const current = await session();

      await expect(service.getPersona(current, 'nao-uuid')).resolves.toEqual({
        ok: false,
        message: 'Agente não encontrado.',
      });

      lavai.getAgent.mockResolvedValueOnce(agent({ kind: 'INTERNAL' }));
      await expect(
        service.updatePersona(current, AGENT_ID, { guardrails: 'x' }),
      ).resolves.toEqual({
        ok: false,
        message: 'Agente não encontrado.',
      });

      lavai.getAgent.mockResolvedValueOnce(
        agent({ companyId: '99999999-9999-4999-8999-999999999999' }),
      );
      await expect(service.getPersona(current, AGENT_ID)).resolves.toEqual({
        ok: false,
        message: 'Agente não encontrado.',
      });

      lavai.getAgent.mockRejectedValueOnce(
        new NotFoundException('detalhe do motor'),
      );
      await expect(service.getPersona(current, AGENT_ID)).resolves.toEqual({
        ok: false,
        message: 'Agente não encontrado.',
      });

      expect(lavai.updatePersona).not.toHaveBeenCalled();
    });

    it('responde LavAI indisponível e a sessão segue para a próxima chamada', async () => {
      const current = await session();
      const error = jest
        .spyOn(Logger.prototype, 'error')
        .mockImplementation(() => undefined);
      lavai.listAgents.mockRejectedValueOnce(
        new InternalServerErrorException('Falha na integração'),
      );

      await expect(service.list(current)).resolves.toEqual({
        ok: false,
        message: 'LavAI indisponível.',
      });

      lavai.listAgents.mockResolvedValueOnce([]);
      await expect(service.list(current)).resolves.toEqual({
        ok: true,
        data: [],
      });
      expect(error).toHaveBeenCalled();
      error.mockRestore();
    });
  });
});
