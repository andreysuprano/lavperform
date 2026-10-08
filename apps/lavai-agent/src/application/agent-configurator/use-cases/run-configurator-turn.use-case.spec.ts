import { NotFoundException } from '@nestjs/common';
import {
  AgentCommunicationStyle,
  AgentKind,
  AgentLanguage,
  AgentVoiceTone,
  type AgentPersonaData,
  type AgentRepositoryPort,
  type AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import type { LlmProviderPort } from '../../agent-runner/ports/llm-provider.port';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import type { PlatformConversationRepositoryPort } from '../../platform-agent/ports/platform-conversation.repository.port';
import { ACTIVITY } from '../configurator-actions';
import type { ConfiguratorActivityEvent } from '../configurator-actions';
import { RunConfiguratorTurnUseCase } from './run-configurator-turn.use-case';

function persona(systemPrompt = 'SEGREDO-NAO-MOSTRAR'): AgentPersonaData {
  return {
    id: 'persona-1',
    agentId: 'public-1',
    personaName: 'Lia',
    personaDescription: null,
    systemPrompt,
    behaviorGuidelines: 'diretrizes',
    guardrails: 'limites',
    contextPrompt: 'contexto-atual',
    welcomeMessage: null,
    messageSignature: null,
    voiceTone: AgentVoiceTone.FRIENDLY,
    communicationStyle: AgentCommunicationStyle.BALANCED,
    language: AgentLanguage.PT_BR,
    createdAt: new Date('2026-10-08T12:00:00.000Z'),
    updatedAt: new Date('2026-10-08T12:00:00.000Z'),
  };
}

function agent(overrides: Partial<AgentWithConfigsData> = {}): AgentWithConfigsData {
  return {
    id: 'configurator',
    companyId: 'platform-company',
    name: 'Configurador',
    description: null,
    active: true,
    kind: AgentKind.INTERNAL,
    instanceName: null,
    platformCode: 'agent-configurator',
    createdAt: new Date(),
    updatedAt: new Date(),
    persona: null,
    modelConfig: { modelName: 'openai/gpt-4o' } as AgentWithConfigsData['modelConfig'],
    memoryConfig: { windowSize: 10 } as AgentWithConfigsData['memoryConfig'],
    mediaConfig: null,
    filterConfig: null,
    journeyConfig: null,
    notificationConfig: null,
    ...overrides,
  };
}

describe('RunConfiguratorTurnUseCase', () => {
  const agents = {
    findByPlatformCode: jest.fn(),
    findById: jest.fn(),
  } as unknown as jest.Mocked<Pick<AgentRepositoryPort, 'findByPlatformCode' | 'findById'>>;

  const conversations = {
    upsert: jest.fn(),
    addMessage: jest.fn(),
    findRecentMessagesExcept: jest.fn(),
  } as unknown as jest.Mocked<Pick<PlatformConversationRepositoryPort, 'upsert' | 'addMessage' | 'findRecentMessagesExcept'>>;

  const llm = {
    complete: jest.fn(),
  } as unknown as jest.Mocked<Pick<LlmProviderPort, 'complete'>>;

  const tracker = {
    startRun: jest.fn(),
    addStep: jest.fn(),
    completeRun: jest.fn(),
    failRun: jest.fn(),
  } as unknown as jest.Mocked<AgentRunTrackerPort>;

  const useCase = new RunConfiguratorTurnUseCase(
    agents as unknown as AgentRepositoryPort,
    conversations as unknown as PlatformConversationRepositoryPort,
    llm as unknown as LlmProviderPort,
    tracker,
  );

  const input = {
    contextCompanyId: 'company-1',
    platformUserId: 'user-1',
    userName: 'Ana',
    companyName: 'Lavanderia Centro',
    targetAgentId: 'public-1',
    text: 'Muda o horário de abertura.',
    serviceModel: 'CONVENTIONAL' as const,
    answers: { hours: '8h' },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    llm.complete.mockReset();
    agents.findByPlatformCode.mockResolvedValue(agent());
    agents.findById.mockResolvedValue(agent({
      id: 'public-1',
      kind: AgentKind.PUBLIC,
      persona: persona(),
    }));
    conversations.upsert.mockResolvedValue({
      id: 'conv-1',
      agentId: 'configurator',
      contextCompanyId: 'company-1',
      platformUserId: 'user-1',
      targetAgentId: 'public-1',
    });
    conversations.addMessage.mockImplementation(async (message) => ({
      id: message.role === MessageRole.ASSISTANT ? 'msg-assistant' : 'msg-user',
      conversationId: message.conversationId,
      role: message.role,
      content: message.content,
      createdAt: new Date(),
      blocksJson: message.blocksJson ?? null,
      proposalStatus: message.proposalStatus ?? null,
    }));
    conversations.findRecentMessagesExcept.mockResolvedValue([]);
    llm.complete.mockResolvedValue({ content: 'Só uma resposta.', toolCalls: [], finishReason: 'stop' });
    tracker.startRun.mockResolvedValue('run-1');
  });

  it('mostra as ações e não devolve o prompt para a interface', async () => {
    const proposal = {
      behavior: 'Passa a informar o horário de abertura.',
      contextPrompt: 'PROMPT-INTERNO',
      systemPrompt: 'sistema',
      behaviorGuidelines: 'diretrizes',
      guardrails: 'limites',
    };
    llm.complete
      .mockResolvedValueOnce({
        content: null,
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'c1', type: 'function', function: { name: 'ler_agente', arguments: '{}' } }],
      })
      .mockResolvedValueOnce({
        content: null,
        finishReason: 'tool_calls',
        toolCalls: [{ id: 'c2', type: 'function', function: { name: 'propor_mudanca', arguments: JSON.stringify(proposal) } }],
      })
      .mockResolvedValueOnce({
        content: 'O agente passa a informar o horário.',
        finishReason: 'stop',
        toolCalls: [],
      });

    const events: ConfiguratorActivityEvent[] = [];
    const result = await useCase.execute(input, (event) => events.push(event));

    expect(events.map((event) => `${event.label}:${event.status}`)).toEqual([
      `${ACTIVITY.readAgent}:running`,
      `${ACTIVITY.readAgent}:done`,
      `${ACTIVITY.thinking}:running`,
      `${ACTIVITY.readSheet}:running`,
      `${ACTIVITY.readSheet}:done`,
      `${ACTIVITY.propose}:running`,
      `${ACTIVITY.propose}:done`,
    ]);
    expect(result.blocks).toEqual([
      { type: 'activity', label: ACTIVITY.readSheet },
      { type: 'activity', label: ACTIVITY.propose },
      { type: 'markdown', content: 'O agente passa a informar o horário.' },
      {
        type: 'proposal',
        messageId: 'msg-assistant',
        behavior: 'Passa a informar o horário de abertura.',
        status: 'pending',
      },
    ]);
    expect(JSON.stringify(result.blocks)).not.toContain('SEGREDO-NAO-MOSTRAR');
    expect(JSON.stringify(result.blocks)).not.toContain('PROMPT-INTERNO');
    expect(JSON.stringify(events)).not.toContain('SEGREDO-NAO-MOSTRAR');

    const firstCall = llm.complete.mock.calls[0][0];
    expect(firstCall.messages[0].content).not.toContain('SEGREDO-NAO-MOSTRAR');
    const toolMessage = llm.complete.mock.calls[1][0].messages.find((message) => message.role === 'tool');
    expect(toolMessage?.content).toContain('SEGREDO-NAO-MOSTRAR');

    const saved = conversations.addMessage.mock.calls.find((call) => call[0].role === MessageRole.ASSISTANT)?.[0];
    expect(saved?.blocksJson).toContain('PROMPT-INTERNO');
    expect(saved?.blocksJson).not.toContain('SEGREDO-NAO-MOSTRAR');
    expect(tracker.completeRun).toHaveBeenCalledWith('run-1', expect.stringContaining('O agente passa a informar o horário.'), 3, 2);
  });

  it('falha o turno quando o modelo não responde', async () => {
    llm.complete.mockRejectedValue(new Error('boom'));
    await expect(useCase.execute(input)).rejects.toThrow('boom');
    expect(tracker.failRun).toHaveBeenCalledWith('run-1', 'boom');
  });

  it('não grava mensagem quando o agente público não existe', async () => {
    agents.findById.mockResolvedValue(null);
    await expect(useCase.execute(input)).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.addMessage).not.toHaveBeenCalled();
  });
});
