import { PromptBuilderService } from './prompt-builder.service';
import { AgentRunnerService } from './agent-runner.service';
import { CUSTOMER_FALLBACK_REPLY } from '../customer-reply';
import { MessageType } from '../../webhook/types/incoming-message.types';
import type { NormalizedAgentPrompt } from '../../webhook/types/normalized-agent-prompt.types';
import {
  AgentCommunicationStyle,
  AgentKind,
  AgentLanguage,
  AgentVoiceTone,
  type AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import { MessageRole, type ConversationData } from '../../webhook/ports/conversation.repository.port';

function agent(): AgentWithConfigsData {
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
    memoryConfig: { windowSize: 10 } as AgentWithConfigsData['memoryConfig'],
    mediaConfig: null,
    filterConfig: null,
    journeyConfig: null,
    notificationConfig: null,
  };
}

function conversation(): ConversationData {
  return {
    id: 'conv-1',
    agentId: 'agent-1',
    companyId: 'company-1',
    chatId: 'playground:session',
    userId: 'user-1',
    userPhone: 'playground',
    userName: 'Ana',
    isGroup: false,
    groupName: null,
    instanceName: 'whatsapp-1',
    instanceToken: 'tok',
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe('AgentRunnerService.complete', () => {
  const conversationRepo = { addMessage: jest.fn(), findRecentMessages: jest.fn() };
  const chunkRepo = { searchSimilar: jest.fn() };
  const embedding = { embed: jest.fn() };
  const llm = { complete: jest.fn() };
  const messageSender = { send: jest.fn() };
  const toolRegistry = { toOpenAiTools: jest.fn().mockReturnValue([]) };
  const toolExecutor = { execute: jest.fn() };
  const mcp = { openSessionsForAgent: jest.fn().mockResolvedValue([]), closeSessions: jest.fn() };
  const tracker = {
    startRun: jest.fn().mockResolvedValue('run-1'),
    addStep: jest.fn(),
    completeRun: jest.fn(),
    failRun: jest.fn(),
  };
  const waitingAck = { clear: jest.fn(), maybeSend: jest.fn() };
  const idleClose = { schedule: jest.fn(), cancel: jest.fn(), cancelChat: jest.fn() };
  const journeys = { findByConversationId: jest.fn() };

  const service = new AgentRunnerService(
    conversationRepo as never,
    chunkRepo as never,
    embedding as never,
    llm as never,
    messageSender as never,
    new PromptBuilderService(),
    toolRegistry as never,
    toolExecutor as never,
    {} as never,
    {} as never,
    {} as never,
    {} as never,
    mcp as never,
    tracker as never,
    waitingAck as never,
    idleClose as never,
    journeys as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    tracker.startRun.mockResolvedValue('run-1');
    conversationRepo.addMessage.mockResolvedValue({ id: 'reply-1' });
    mcp.openSessionsForAgent.mockResolvedValue([]);
    toolRegistry.toOpenAiTools.mockReturnValue([]);
    embedding.embed.mockResolvedValue([0.1]);
    chunkRepo.searchSimilar.mockResolvedValue([
      {
        id: 'chunk-1',
        knowledgeBaseId: 'kb',
        companyId: 'company-1',
        content: 'Lavagem custa R$ 20',
        metadata: {},
        embeddingModel: 'm',
        createdAt: new Date(),
        score: 0.9,
      },
    ]);
  });

  it('responde com o prompt salvo e a base, sem gravar nem enviar', async () => {
    llm.complete.mockResolvedValue({ content: 'Custa R$ 20', toolCalls: [], finishReason: 'stop' });

    const text = await service.complete({
      agent: agent(),
      conversation: conversation(),
      history: [
        {
          id: 'm1',
          conversationId: 'conv-1',
          role: MessageRole.USER,
          content: 'Oi',
          originalType: 'TEXT',
          createdAt: new Date(),
        },
      ],
      userMessage: 'Qual o preço?',
      sender: {
        senderName: 'Ana',
        senderPhone: 'playground',
        chatId: 'playground:session',
        isGroup: false,
      },
    });

    expect(text).toBe('Custa R$ 20');
    const messages = llm.complete.mock.calls[0][0].messages as Array<{ role: string; content: string }>;
    expect(messages[0].content).toContain('PROMPT-SALVO');
    expect(messages[0].content).toContain('Lavagem custa R$ 20');
    expect(messages.some((message) => message.content === 'Oi')).toBe(true);
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(messageSender.send).not.toHaveBeenCalled();
    expect(waitingAck.clear).not.toHaveBeenCalled();
    expect(waitingAck.maybeSend).not.toHaveBeenCalled();
    expect(conversationRepo.findRecentMessages).not.toHaveBeenCalled();
  });

  it('executa a ferramenta e devolve o texto seguinte', async () => {
    toolRegistry.toOpenAiTools.mockReturnValue([
      { type: 'function', function: { name: 'get_datetime', description: 'agora', parameters: {} } },
    ]);
    llm.complete
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [{ id: 'call-1', type: 'function', function: { name: 'get_datetime', arguments: '{}' } }],
        finishReason: 'tool_calls',
      })
      .mockResolvedValueOnce({ content: 'Agora são 10h', toolCalls: [], finishReason: 'stop' });
    toolExecutor.execute.mockResolvedValue([{ tool_call_id: 'call-1', content: '{"now":"10h"}' }]);

    const text = await service.complete({
      agent: agent(),
      conversation: conversation(),
      history: [],
      userMessage: 'Que horas são?',
      sender: {
        senderName: 'Ana',
        senderPhone: 'playground',
        chatId: 'playground:session',
        isGroup: false,
      },
    });

    expect(text).toBe('Agora são 10h');
    expect(toolExecutor.execute).toHaveBeenCalledWith(
      [expect.objectContaining({ id: 'call-1' })],
      expect.objectContaining({ conversationId: 'conv-1', senderPhone: 'playground' }),
      [],
    );
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(messageSender.send).not.toHaveBeenCalled();
  });

  it('responde com uma frase simples quando o modelo falha', async () => {
    llm.complete.mockRejectedValue(new Error('timeout'));

    const text = await service.complete(turn());

    expect(text).toBe(CUSTOMER_FALLBACK_REPLY);
    expect(tracker.failRun).not.toHaveBeenCalled();
    expect(tracker.completeRun).toHaveBeenCalledWith('run-1', CUSTOMER_FALLBACK_REPLY, 0, 0);
    expect(mcp.closeSessions).toHaveBeenCalled();
    expect(messageSender.send).not.toHaveBeenCalled();
  });

  it('pede uma resposta direta quando as ferramentas não geram texto', async () => {
    toolRegistry.toOpenAiTools.mockReturnValue([
      { type: 'function', function: { name: 'get_datetime', description: 'agora', parameters: {} } },
    ]);
    llm.complete
      .mockResolvedValueOnce({
        content: null,
        toolCalls: [{ id: 'call-1', type: 'function', function: { name: 'get_datetime', arguments: '{}' } }],
        finishReason: 'tool_calls',
      })
      .mockResolvedValueOnce({ content: '   ', toolCalls: [], finishReason: 'stop' })
      .mockResolvedValueOnce({ content: 'Agora são 10h', toolCalls: [], finishReason: 'stop' });
    toolExecutor.execute.mockResolvedValue([{ tool_call_id: 'call-1', content: '{"now":"10h"}' }]);

    const text = await service.complete(turn());

    expect(text).toBe('Agora são 10h');
    expect(llm.complete).toHaveBeenCalledTimes(3);
    expect(llm.complete.mock.calls[2][0].tools).toBeUndefined();
  });

  it('entrega a frase simples quando o modelo falha no atendimento', async () => {
    conversationRepo.findRecentMessages.mockResolvedValue([]);
    llm.complete.mockRejectedValue(new Error('timeout'));

    await service.run(inbound(), conversation(), agent());

    expect(messageSender.send).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 'playground:session' }),
      { type: 'text', text: expect.stringContaining(CUSTOMER_FALLBACK_REPLY) },
    );
    expect(conversationRepo.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ content: CUSTOMER_FALLBACK_REPLY }),
    );
    expect(waitingAck.clear).toHaveBeenCalledWith('agent-1', 'playground:session');
    expect(waitingAck.maybeSend).not.toHaveBeenCalled();
  });

  it('agenda o prazo depois da resposta quando a jornada está ACTIVE', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'ACTIVE' });

    await service.run(inbound(), conversation(), idleAgent());

    expect(idleClose.schedule).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      agentId: 'agent-1',
      anchorMessageId: 'reply-1',
      delayMs: 60 * 60 * 1000,
    });
    expect(waitingAck.clear.mock.invocationCallOrder[0]).toBeLessThan(
      idleClose.schedule.mock.invocationCallOrder[0],
    );
  });

  it('não agenda o prazo quando a jornada não existe', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue(null);

    await service.run(inbound(), conversation(), idleAgent());

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  it('não agenda o prazo quando a jornada não está ACTIVE', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'CLOSED' });

    await service.run(inbound(), conversation(), idleAgent());

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  it('não agenda o prazo quando a jornada geral está desligada', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'ACTIVE' });

    await service.run(inbound(), conversation(), idleAgent({ enabled: false }));

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  it('não agenda o prazo quando o encerramento está desligado', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'ACTIVE' });

    await service.run(inbound(), conversation(), idleAgent({ idleCloseEnabled: false }));

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  it('não agenda o prazo quando o texto de encerramento está vazio', async () => {
    prepareReply();
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'ACTIVE' });

    await service.run(inbound(), conversation(), idleAgent({ idleCloseMessage: '   ' }));

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  it('complete não agenda o prazo de silêncio', async () => {
    journeys.findByConversationId.mockResolvedValue({ id: 'journey-1', status: 'ACTIVE' });
    llm.complete.mockResolvedValue({ content: 'Custa R$ 20', toolCalls: [], finishReason: 'stop' });

    await service.complete({
      ...turn(),
      agent: idleAgent(),
    });

    expect(idleClose.schedule).not.toHaveBeenCalled();
  });

  function prepareReply() {
    conversationRepo.findRecentMessages.mockResolvedValue([]);
    conversationRepo.addMessage.mockResolvedValue({ id: 'reply-1' });
    llm.complete.mockResolvedValue({
      content: 'Segue o preço',
      toolCalls: [],
      finishReason: 'stop',
    });
    messageSender.send.mockResolvedValue(undefined);
    waitingAck.clear.mockResolvedValue(undefined);
  }
});

function idleAgent(
  overrides: Partial<NonNullable<AgentWithConfigsData['journeyConfig']>> = {},
): AgentWithConfigsData {
  return {
    ...agent(),
    journeyConfig: {
      enabled: true,
      idleCloseEnabled: true,
      idleCloseMinutes: 60,
      idleCloseMessage: 'Vou encerrar este atendimento.',
      ...overrides,
    } as AgentWithConfigsData['journeyConfig'],
  };
}

function turn() {
  return {
    agent: agent(),
    conversation: conversation(),
    history: [] as never[],
    userMessage: 'Que horas são?',
    sender: {
      senderName: 'Ana',
      senderPhone: 'playground',
      chatId: 'playground:session',
      isGroup: false,
    },
  };
}

function inbound(): NormalizedAgentPrompt {
  return {
    userMessage: 'Oi',
    triggerText: 'Oi',
    originalMessageType: MessageType.TEXT,
    context: {
      webhookEventId: 'evt-1',
      companyId: 'company-1',
      agentId: 'agent-1',
      senderPhone: '5511999999999',
      senderName: 'Ana',
      chatId: 'playground:session',
      instanceName: 'whatsapp-1',
      timestamp: 1,
      isGroup: false,
    },
  };
}
