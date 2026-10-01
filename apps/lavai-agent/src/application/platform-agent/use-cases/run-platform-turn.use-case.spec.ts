import { BadGatewayException, NotFoundException } from '@nestjs/common';
import { AgentKind } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort, AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { LlmProviderPort } from '../../agent-runner/ports/llm-provider.port';
import type { PromptBuilderService } from '../../agent-runner/services/prompt-builder.service';
import type { AgentRunTrackerPort } from '../../agent-trace/ports/agent-run-tracker.port';
import { MessageRole } from '../../webhook/ports/conversation.repository.port';
import type {
  PlatformConversationRepositoryPort,
  PlatformMessageData,
} from '../ports/platform-conversation.repository.port';
import { RunPlatformTurnUseCase } from './run-platform-turn.use-case';

function agent(overrides: Partial<AgentWithConfigsData> = {}): AgentWithConfigsData {
  return {
    id: 'agent-1',
    companyId: 'platform-company',
    name: 'Relatórios',
    description: null,
    active: true,
    kind: AgentKind.INTERNAL,
    instanceName: null,
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

describe('RunPlatformTurnUseCase', () => {
  const messages: PlatformMessageData[] = [];
  let sequence = 0;

  const agents = {
    findById: jest.fn(),
  } as unknown as jest.Mocked<AgentRepositoryPort>;

  const conversations: jest.Mocked<PlatformConversationRepositoryPort> = {
    upsert: jest.fn(),
    findByTrio: jest.fn(),
    addMessage: jest.fn(async (input) => {
      const message: PlatformMessageData = {
        id: `msg-${++sequence}`,
        conversationId: input.conversationId,
        role: input.role,
        content: input.content,
        createdAt: new Date(sequence * 1000),
      };
      messages.push(message);
      return message;
    }),
    findRecentMessagesExcept: jest.fn(async (_conversationId, excludeId, limit) =>
      messages.filter((message) => message.id !== excludeId).slice(-limit),
    ),
    listLatestMessages: jest.fn(),
  };

  const promptBuilder = {
    build: jest.fn().mockReturnValue([{ role: 'user', content: 'pergunta' }]),
  } as unknown as jest.Mocked<PromptBuilderService>;

  const llm: jest.Mocked<LlmProviderPort> = {
    complete: jest.fn().mockResolvedValue({ content: 'resposta', toolCalls: [], finishReason: 'stop' }),
  };

  const tracker: jest.Mocked<AgentRunTrackerPort> = {
    startRun: jest.fn().mockResolvedValue('run-1'),
    addStep: jest.fn(),
    completeRun: jest.fn(),
    failRun: jest.fn(),
  };

  const useCase = new RunPlatformTurnUseCase(agents, conversations, promptBuilder, llm, tracker);

  const input = {
    contextCompanyId: 'company-1',
    platformUserId: 'user-1',
    userName: 'Ana',
    companyName: 'Lavanderia Centro',
    text: 'Quanto vendemos hoje?',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    messages.length = 0;
    sequence = 0;
    agents.findById.mockResolvedValue(agent());
    conversations.upsert.mockResolvedValue({
      id: 'conv-1',
      agentId: 'agent-1',
      contextCompanyId: 'company-1',
      platformUserId: 'user-1',
    });
    llm.complete.mockResolvedValue({ content: 'resposta', toolCalls: [], finishReason: 'stop' });
  });

  it('compartilha o histórico do trio e não repete a pergunta atual', async () => {
    await useCase.execute('agent-1', input);
    await useCase.execute('agent-1', { ...input, text: 'E ontem?' });

    const secondHistory = jest.mocked(promptBuilder.build).mock.calls[1][1];
    expect(secondHistory.map((message) => message.content)).toEqual([
      'Quanto vendemos hoje?',
      'resposta',
    ]);
    expect(jest.mocked(promptBuilder.build).mock.calls[1][3]).toBe('E ontem?');
    expect(jest.mocked(promptBuilder.build).mock.calls[1][5]).toEqual({
      userName: 'Ana',
      companyName: 'Lavanderia Centro',
    });
    expect(conversations.upsert).toHaveBeenCalledTimes(2);
  });

  it('abre outra conversa para outro usuário', async () => {
    await useCase.execute('agent-1', input);
    await useCase.execute('agent-1', { ...input, platformUserId: 'user-2', text: 'Oi' });

    expect(conversations.upsert).toHaveBeenNthCalledWith(2, {
      agentId: 'agent-1',
      contextCompanyId: 'company-1',
      platformUserId: 'user-2',
    });
  });

  it('responde 404 para agente público ou inativo', async () => {
    agents.findById.mockResolvedValue(agent({ kind: AgentKind.PUBLIC }));
    await expect(useCase.execute('agent-1', input)).rejects.toBeInstanceOf(NotFoundException);

    agents.findById.mockResolvedValue(agent({ active: false }));
    await expect(useCase.execute('agent-1', input)).rejects.toBeInstanceOf(NotFoundException);
    expect(conversations.addMessage).not.toHaveBeenCalled();
  });

  it('mantém a mensagem do usuário quando o modelo falha e não grava assistente', async () => {
    llm.complete.mockRejectedValue(new Error('timeout'));

    await expect(useCase.execute('agent-1', input)).rejects.toBeInstanceOf(BadGatewayException);

    const roles = messages.map((message) => message.role);
    expect(roles).toEqual([MessageRole.USER]);
    expect(tracker.failRun).toHaveBeenCalledWith('run-1', 'timeout');
    expect(tracker.completeRun).not.toHaveBeenCalled();
  });

  it('trata resposta vazia como falha do modelo', async () => {
    llm.complete.mockResolvedValue({ content: '   ', toolCalls: [], finishReason: 'stop' });

    await expect(useCase.execute('agent-1', input)).rejects.toBeInstanceOf(BadGatewayException);
    expect(messages.map((message) => message.role)).toEqual([MessageRole.USER]);
    expect(tracker.failRun).toHaveBeenCalledWith('run-1', 'Resposta vazia do modelo');
  });
});
