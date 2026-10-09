import { BadGatewayException, BadRequestException, NotFoundException } from '@nestjs/common';
import {
  AgentCommunicationStyle,
  AgentKind,
  AgentLanguage,
  AgentVoiceTone,
  type AgentRepositoryPort,
  type AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import type { AgentRunnerService } from '../../agent-runner/services/agent-runner.service';
import type { JourneyOrchestratorService } from '../../customer-journey/services/journey-orchestrator.service';
import {
  MessageRole,
  type ConversationData,
  type ConversationRepositoryPort,
} from '../../webhook/ports/conversation.repository.port';
import { PLAYGROUND_FAILED, PLAYGROUND_HANDOFF, PLAYGROUND_UNAVAILABLE } from '../playground-conversation';
import { RunPlaygroundTurnUseCase } from './run-playground-turn.use-case';

const SESSION = '550e8400-e29b-41d4-a716-446655440000';

function agent(overrides: Partial<AgentWithConfigsData> = {}): AgentWithConfigsData {
  return {
    id: 'agent-1',
    companyId: 'company-1',
    name: 'Lia',
    description: null,
    active: true,
    kind: AgentKind.PUBLIC,
    instanceName: 'whatsapp-1',
    platformCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    persona: {
      id: 'persona-1',
      agentId: 'agent-1',
      personaName: 'Lia',
      personaDescription: null,
      systemPrompt: 'PROMPT-SALVO',
      behaviorGuidelines: '',
      guardrails: '',
      contextPrompt: '',
      welcomeMessage: null,
      messageSignature: 'Equipe',
      voiceTone: AgentVoiceTone.FRIENDLY,
      communicationStyle: AgentCommunicationStyle.BALANCED,
      language: AgentLanguage.PT_BR,
      createdAt: new Date(),
      updatedAt: new Date(),
    },
    modelConfig: { modelName: 'openai/gpt-4o' } as AgentWithConfigsData['modelConfig'],
    memoryConfig: { windowSize: 2 } as AgentWithConfigsData['memoryConfig'],
    mediaConfig: null,
    filterConfig: null,
    journeyConfig: null,
    notificationConfig: null,
    ...overrides,
  };
}

function hiddenConversation(): ConversationData {
  return {
    id: 'hidden-1',
    agentId: 'agent-1',
    companyId: 'company-1',
    chatId: `playground:${SESSION}`,
    userId: 'user-1',
    userPhone: 'playground',
    userName: 'Ana',
    isGroup: false,
    groupName: null,
    instanceName: 'whatsapp-1',
    instanceToken: 'tok-real',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('RunPlaygroundTurnUseCase', () => {
  const agents = { findById: jest.fn() } as unknown as jest.Mocked<Pick<AgentRepositoryPort, 'findById'>>;
  const conversations = {
    findLatestInstanceToken: jest.fn(),
    upsert: jest.fn(),
    addMessage: jest.fn(),
  } as unknown as jest.Mocked<
    Pick<ConversationRepositoryPort, 'findLatestInstanceToken' | 'upsert' | 'addMessage'>
  >;
  const journey = { onInboundMessage: jest.fn() } as unknown as jest.Mocked<
    Pick<JourneyOrchestratorService, 'onInboundMessage'>
  >;
  const runner = { complete: jest.fn() } as unknown as jest.Mocked<Pick<AgentRunnerService, 'complete'>>;

  const useCase = new RunPlaygroundTurnUseCase(
    agents as never,
    conversations as never,
    journey as never,
    runner as never,
  );

  const input = {
    contextCompanyId: 'company-1',
    platformUserId: 'user-1',
    userName: 'Ana',
    targetAgentId: 'agent-1',
    sessionId: SESSION,
    content: 'Qual o horário?',
    history: [
      { role: 'system', content: 'ignorar' },
      { role: 'user', content: 'um' },
      { role: 'assistant', content: 'dois' },
      { role: 'user', content: 'três' },
    ],
  };

  beforeEach(() => {
    jest.clearAllMocks();
    agents.findById.mockResolvedValue(agent());
    conversations.findLatestInstanceToken.mockResolvedValue('tok-real');
    conversations.upsert.mockResolvedValue(hiddenConversation());
    journey.onInboundMessage.mockResolvedValue({ skipLlm: false, escalated: false });
    runner.complete.mockResolvedValue('Abrimos às 8h');
  });

  it('devolve a resposta com assinatura e corta o histórico na janela', async () => {
    const result = await useCase.execute(input);

    expect(result).toEqual({ content: 'Abrimos às 8h\n\nEquipe' });
    expect(conversations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        chatId: `playground:${SESSION}`,
        userId: 'user-1',
        userPhone: 'playground',
        userName: 'Ana',
        instanceName: 'whatsapp-1',
        instanceToken: 'tok-real',
      }),
    );
    expect(runner.complete).toHaveBeenCalledWith(
      expect.objectContaining({
        userMessage: 'Qual o horário?',
        history: [
          expect.objectContaining({ role: MessageRole.ASSISTANT, content: 'dois' }),
          expect.objectContaining({ role: MessageRole.USER, content: 'três' }),
        ],
      }),
    );
    expect(conversations.addMessage).not.toHaveBeenCalled();
  });

  it('usa o telefone playground quando não há conversa real', async () => {
    conversations.findLatestInstanceToken.mockResolvedValue(null);
    agents.findById.mockResolvedValue(agent({ instanceName: '  ' }));

    await useCase.execute(input);

    expect(conversations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({ instanceName: 'playground', instanceToken: 'playground' }),
    );
  });

  it('passa para um humano sem chamar o modelo e mantém a conversa oculta', async () => {
    journey.onInboundMessage.mockResolvedValue({ skipLlm: true, escalated: true });

    await expect(useCase.execute(input)).resolves.toEqual({ content: PLAYGROUND_HANDOFF });
    expect(runner.complete).not.toHaveBeenCalled();
    expect(conversations.upsert).toHaveBeenCalled();
  });

  it.each([
    ['sessionId inválido', { sessionId: 'visita' }],
    ['texto vazio', { content: '   ' }],
  ])('responde 400 para %s', async (_label, override) => {
    const error = await useCase.execute({ ...input, ...override }).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadRequestException);
    expect((error as BadRequestException).message).toBe(PLAYGROUND_FAILED);
  });

  it.each([
    ['agente ausente', null],
    ['outra empresa', agent({ companyId: 'outra' })],
    ['agente interno', agent({ kind: AgentKind.INTERNAL })],
  ])('responde 404 para %s', async (_label, found) => {
    agents.findById.mockResolvedValue(found);
    const error = await useCase.execute(input).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(NotFoundException);
    expect((error as NotFoundException).message).toBe(PLAYGROUND_UNAVAILABLE);
    expect(conversations.upsert).not.toHaveBeenCalled();
  });

  it('responde 502 quando o modelo devolve texto vazio', async () => {
    runner.complete.mockResolvedValue('   ');
    const error = await useCase.execute(input).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadGatewayException);
    expect((error as BadGatewayException).message).toBe(PLAYGROUND_FAILED);
  });

  it('responde 502 quando o modelo falha, depois da ferramenta já ter rodado', async () => {
    runner.complete.mockRejectedValue(new Error('llm down'));
    const error = await useCase.execute(input).catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(BadGatewayException);
    expect(conversations.upsert).toHaveBeenCalled();
  });
});
