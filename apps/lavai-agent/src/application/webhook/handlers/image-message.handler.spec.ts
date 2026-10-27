import { ImageMessageHandler } from './image-message.handler';
import { MessageType, type ImageIncomingMessage } from '../types/incoming-message.types';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { NormalizedAgentPrompt } from '../types/normalized-agent-prompt.types';

describe('ImageMessageHandler', () => {
  const normalizer = { normalize: jest.fn() };
  const filter = { checkAccess: jest.fn(), checkTrigger: jest.fn() };
  const conversationRepository = {
    upsert: jest.fn(),
    addMessage: jest.fn(),
  };
  const runner = { run: jest.fn() };
  const idleClose = { cancel: jest.fn() };

  const handler = new ImageMessageHandler(
    normalizer as never,
    filter as never,
    conversationRepository as never,
    runner as never,
    idleClose as never,
  );

  const agent = { id: 'agent-1' } as AgentWithConfigsData;

  const message = {
    type: MessageType.IMAGE,
    webhookEventId: 'evt-1',
    companyId: 'company-1',
    messageId: 'msg-1',
    chatId: 'chat-1',
    senderId: 'sender-1',
    senderName: 'Ana',
    senderPhone: '5511999999999',
    isFromMe: false,
    wasSentByApi: false,
    isGroup: false,
    timestamp: 1,
    instanceName: 'inst-1',
    instanceToken: 'tok-1',
    mediaUrl: 'https://example.test/img.jpg',
    mimeType: 'image/jpeg',
    caption: 'oi',
  } as ImageIncomingMessage;

  const prompt = {
    userMessage: 'uma imagem',
    triggerText: 'oi',
    originalMessageType: MessageType.IMAGE,
    context: {
      webhookEventId: 'evt-1',
      companyId: 'company-1',
      agentId: 'agent-1',
      senderPhone: '5511999999999',
      senderName: 'Ana',
      chatId: 'chat-1',
      instanceName: 'inst-1',
      timestamp: 1,
      isGroup: false,
    },
  } as NormalizedAgentPrompt;

  beforeEach(() => {
    jest.clearAllMocks();
    filter.checkAccess.mockResolvedValue({ allowed: true });
    filter.checkTrigger.mockReturnValue({ allowed: true, cleanedText: 'oi' });
    normalizer.normalize.mockResolvedValue(prompt);
    conversationRepository.upsert.mockResolvedValue({ id: 'conv-1' });
    conversationRepository.addMessage.mockResolvedValue({ id: 'user-1' });
    runner.run.mockResolvedValue(undefined);
    idleClose.cancel.mockResolvedValue(undefined);
  });

  it('cancela o prazo e chama o runner quando o filtro libera', async () => {
    await handler.handle(message, agent);

    expect(idleClose.cancel).toHaveBeenCalledWith('conv-1');
    expect(runner.run).toHaveBeenCalledWith(
      prompt,
      expect.objectContaining({ id: 'conv-1' }),
      agent,
    );
    expect(idleClose.cancel.mock.invocationCallOrder[0]).toBeLessThan(
      runner.run.mock.invocationCallOrder[0],
    );
  });

  it('não cancela o prazo quando o filtro bloqueia', async () => {
    filter.checkAccess.mockResolvedValue({ allowed: false, reason: 'bloqueado' });

    await handler.handle(message, agent);

    expect(idleClose.cancel).not.toHaveBeenCalled();
    expect(runner.run).not.toHaveBeenCalled();
  });
});
