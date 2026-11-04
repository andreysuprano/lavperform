import { TypingResumeService } from './typing-resume.service';
import { MessageRole } from '../ports/conversation.repository.port';

function message(role: MessageRole, content: string, originalType: string | null = null) {
  return {
    id: `${role}-${content}`,
    conversationId: 'conv-1',
    role,
    content,
    originalType,
    createdAt: new Date(),
  };
}

describe('TypingResumeService', () => {
  const typing = {
    getPending: jest.fn(),
    isPaused: jest.fn(),
    clearPending: jest.fn(),
  };
  const takeover = { isInTakeover: jest.fn() };
  const conversations = {
    findById: jest.fn(),
    findRecentMessages: jest.fn(),
    addMessage: jest.fn(),
  };
  const agents = { findById: jest.fn() };
  const agentRunner = { run: jest.fn() };

  const service = new TypingResumeService(
    typing as never,
    takeover as never,
    conversations as never,
    agents as never,
    agentRunner as never,
  );

  const conversation = {
    id: 'conv-1',
    agentId: 'agent-1',
    companyId: 'company-1',
    chatId: '5511999999999',
    userId: 'user-1',
    userPhone: '5511999999999',
    userName: 'Ana',
    isGroup: false,
    groupName: null,
    instanceName: 'whatsapp-1',
    instanceToken: 'tok',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    typing.getPending.mockResolvedValue('conv-1');
    typing.isPaused.mockResolvedValue(false);
    typing.clearPending.mockResolvedValue(undefined);
    takeover.isInTakeover.mockResolvedValue(false);
    conversations.findById.mockResolvedValue(conversation);
    agents.findById.mockResolvedValue({ id: 'agent-1', active: true });
    agentRunner.run.mockResolvedValue(undefined);
  });

  it('não faz nada sem marcador', async () => {
    typing.getPending.mockResolvedValue(null);

    await service.resume('agent-1', '5511999999999');

    expect(agentRunner.run).not.toHaveBeenCalled();
    expect(typing.clearPending).not.toHaveBeenCalled();
  });

  it('mantém o marcador enquanto a pausa está ativa', async () => {
    typing.isPaused.mockResolvedValue(true);

    await service.resume('agent-1', '5511999999999');

    expect(agentRunner.run).not.toHaveBeenCalled();
    expect(typing.clearPending).not.toHaveBeenCalled();
  });

  it('mantém o marcador enquanto o takeover está ativo', async () => {
    takeover.isInTakeover.mockResolvedValue(true);

    await service.resume('agent-1', '5511999999999');

    expect(agentRunner.run).not.toHaveBeenCalled();
    expect(typing.clearPending).not.toHaveBeenCalled();
  });

  it('apaga o marcador quando a conversa não existe', async () => {
    conversations.findById.mockResolvedValue(null);

    await service.resume('agent-1', '5511999999999');

    expect(typing.clearPending).toHaveBeenCalledWith('agent-1', '5511999999999');
    expect(agentRunner.run).not.toHaveBeenCalled();
  });

  it('retoma quando o último item real é USER, sem gravar USER', async () => {
    conversations.findRecentMessages.mockResolvedValue([
      message(MessageRole.ASSISTANT, 'Olá'),
      message(MessageRole.USER, 'Qual o preço?'),
    ]);

    await service.resume('agent-1', '5511999999999');

    expect(agentRunner.run).toHaveBeenCalledTimes(1);
    const [prompt, conv, agent] = agentRunner.run.mock.calls[0];
    expect(prompt).toEqual(
      expect.objectContaining({
        userMessage: 'Qual o preço?',
        originalMessageType: 'TEXT',
        context: expect.objectContaining({
          webhookEventId: 'typing-resume',
          chatId: '5511999999999',
          agentId: 'agent-1',
          companyId: 'company-1',
          senderName: 'Ana',
          instanceName: 'whatsapp-1',
        }),
      }),
    );
    expect(conv).toBe(conversation);
    expect(agent).toEqual({ id: 'agent-1', active: true });
    expect(conversations.addMessage).not.toHaveBeenCalled();
  });

  it('apaga o marcador quando o último item real é ASSISTANT', async () => {
    conversations.findRecentMessages.mockResolvedValue([
      message(MessageRole.USER, 'Oi'),
      message(MessageRole.ASSISTANT, 'Olá'),
    ]);

    await service.resume('agent-1', '5511999999999');

    expect(typing.clearPending).toHaveBeenCalledWith('agent-1', '5511999999999');
    expect(agentRunner.run).not.toHaveBeenCalled();
  });

  it.each(['WAITING_ACK', 'FOLLOW_UP', 'IDLE_CLOSE'])(
    '%s depois do USER não esconde o USER',
    async (type) => {
      conversations.findRecentMessages.mockResolvedValue([
        message(MessageRole.USER, 'Qual o preço?'),
        message(MessageRole.ASSISTANT, 'Um instante', type),
      ]);

      await service.resume('agent-1', '5511999999999');

      expect(agentRunner.run).toHaveBeenCalledTimes(1);
      expect(agentRunner.run.mock.calls[0][0].userMessage).toBe('Qual o preço?');
    },
  );

  it('apaga o marcador quando não há mensagens', async () => {
    conversations.findRecentMessages.mockResolvedValue([]);

    await service.resume('agent-1', '5511999999999');

    expect(typing.clearPending).toHaveBeenCalledWith('agent-1', '5511999999999');
    expect(agentRunner.run).not.toHaveBeenCalled();
  });
});
