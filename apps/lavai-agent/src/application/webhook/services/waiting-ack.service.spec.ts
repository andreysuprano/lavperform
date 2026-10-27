import { WaitingAckService } from './waiting-ack.service';
import { MessageFilterService } from './message-filter.service';
import { WAITING_ACK_DEFAULT } from '../../agent/attendance-defaults';
import {
  AgentKind,
  type AgentFilterConfigData,
  type AgentWithConfigsData,
} from '../../agent/ports/agent.repository.port';
import { MessageRole } from '../ports/conversation.repository.port';
import {
  MessageType,
  type ImageIncomingMessage,
  type TextIncomingMessage,
} from '../types/incoming-message.types';

describe('WaitingAckService', () => {
  const redis = {
    set: jest.fn(),
    del: jest.fn(),
  };
  const sender = { send: jest.fn() };
  const conversations = {
    upsert: jest.fn(),
    addMessage: jest.fn(),
  };
  const takeover = { isInTakeover: jest.fn() };
  const filter = new MessageFilterService(
    takeover as never,
    { release: jest.fn() } as never,
  );

  const service = new WaitingAckService(
    { getOrThrow: jest.fn() } as never,
    sender as never,
    conversations as never,
    takeover as never,
    filter,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    (service as unknown as { redis: typeof redis }).redis = redis;
    redis.set.mockResolvedValue('OK');
    redis.del.mockResolvedValue(1);
    sender.send.mockResolvedValue(undefined);
    conversations.upsert.mockResolvedValue({ id: 'conv-1' });
    conversations.addMessage.mockResolvedValue({ id: 'msg-1' });
    takeover.isInTakeover.mockResolvedValue(false);
  });

  it('envia a saudação, grava WAITING_ACK e reserva a chave por 120s', async () => {
    await service.maybeSend(textMessage(), publicAgent(), { dedupe: true });

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledWith(
      { instanceName: 'inst-1', instanceToken: 'tok-1', chatId: 'chat-1' },
      { type: 'text', text: WAITING_ACK_DEFAULT },
    );
    expect(redis.set).toHaveBeenCalledWith(
      'waiting-ack:agent-1:chat-1',
      '1',
      'EX',
      120,
      'NX',
    );
    expect(conversations.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        agentId: 'agent-1',
        companyId: 'company-1',
        chatId: 'chat-1',
        userId: 'sender-1',
        userPhone: '5511999999999',
        userName: 'Ana',
        isGroup: false,
        instanceName: 'inst-1',
        instanceToken: 'tok-1',
      }),
    );
    expect(conversations.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      role: MessageRole.ASSISTANT,
      content: WAITING_ACK_DEFAULT,
      originalType: 'WAITING_ACK',
    });
  });

  it('não envia a segunda chamada quando a chave já existe', async () => {
    redis.set.mockResolvedValueOnce('OK').mockResolvedValueOnce(null);

    await service.maybeSend(textMessage(), publicAgent(), { dedupe: true });
    await service.maybeSend(textMessage(), publicAgent(), { dedupe: true });

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(conversations.addMessage).toHaveBeenCalledTimes(1);
  });

  it('não envia quando o atendente está em controle', async () => {
    takeover.isInTakeover.mockResolvedValue(true);

    await service.maybeSend(textMessage(), publicAgent(), { dedupe: true });

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('não envia o termo #ia escrito pelo próprio aparelho', async () => {
    await service.maybeSend(
      textMessage({ isFromMe: true, text: '#ia' }),
      publicAgent(),
      { dedupe: true },
    );

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('não envia quando o gatilho está ausente', async () => {
    await service.maybeSend(
      textMessage({ text: 'oi' }),
      publicAgent({
        filterConfig: filterConfig({
          triggerEnabled: true,
          triggerWords: ['pedido'],
        }),
      }),
      { dedupe: true },
    );

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('não envia quando o agente está inativo', async () => {
    await service.maybeSend(textMessage(), publicAgent({ active: false }), {
      dedupe: true,
    });

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('não envia para o chat do playground', async () => {
    await service.maybeSend(
      textMessage({ chatId: 'playground:sessao' }),
      publicAgent(),
      { dedupe: true },
    );

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('não envia o texto ajuda quando a jornada escala sozinha', async () => {
    await service.maybeSend(
      textMessage({ text: 'ajuda' }),
      publicAgent({
        enabled: true,
        helpAutoEscalate: true,
        helpKeywords: ['ajuda'],
      }),
      { dedupe: true },
    );

    expect(sender.send).not.toHaveBeenCalled();
    expect(redis.set).not.toHaveBeenCalled();
  });

  it('envia imagem com legenda ajuda, sem usar a regra de ajuda nem a chave', async () => {
    const image: ImageIncomingMessage = {
      ...textMessage(),
      type: MessageType.IMAGE,
      mediaUrl: 'https://cdn.example/foto.jpg',
      mimeType: 'image/jpeg',
      caption: 'ajuda',
    };

    await service.maybeSend(
      image,
      publicAgent({
        enabled: true,
        helpAutoEscalate: true,
        helpKeywords: ['ajuda'],
      }),
      { dedupe: false },
    );

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledWith(
      expect.objectContaining({ chatId: 'chat-1' }),
      { type: 'text', text: WAITING_ACK_DEFAULT },
    );
    expect(redis.set).not.toHaveBeenCalled();
    expect(conversations.addMessage).toHaveBeenCalledWith(
      expect.objectContaining({ originalType: 'WAITING_ACK' }),
    );
  });

  it('resolve sem gravar histórico e apaga a chave quando o envio falha', async () => {
    sender.send.mockRejectedValue(new Error('whatsapp fora'));

    await expect(
      service.maybeSend(textMessage(), publicAgent(), { dedupe: true }),
    ).resolves.toBeUndefined();

    expect(conversations.upsert).not.toHaveBeenCalled();
    expect(conversations.addMessage).not.toHaveBeenCalled();
    expect(redis.del).toHaveBeenCalledWith('waiting-ack:agent-1:chat-1');
  });

  it('apaga a chave da saudação', async () => {
    await service.clear('agent-1', 'chat-1');

    expect(redis.del).toHaveBeenCalledWith('waiting-ack:agent-1:chat-1');
  });
});

function textMessage(
  overrides: Partial<TextIncomingMessage> = {},
): TextIncomingMessage {
  return {
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
    type: MessageType.TEXT,
    text: 'quero lavar o carro',
    ...overrides,
  };
}

function publicAgent(
  overrides: {
    active?: boolean;
    kind?: AgentKind;
    enabled?: boolean;
    helpAutoEscalate?: boolean;
    helpKeywords?: string[];
    waitingAckEnabled?: boolean;
    waitingAckMessage?: string;
    filterConfig?: AgentFilterConfigData | null;
    notificationConfig?: AgentWithConfigsData['notificationConfig'];
  } = {},
): AgentWithConfigsData {
  return {
    id: 'agent-1',
    companyId: 'company-1',
    name: 'Lia',
    description: null,
    active: overrides.active ?? true,
    kind: overrides.kind ?? AgentKind.PUBLIC,
    instanceName: 'inst-1',
    platformCode: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    persona: null,
    modelConfig: null,
    memoryConfig: null,
    mediaConfig: null,
    filterConfig: overrides.filterConfig ?? null,
    notificationConfig: overrides.notificationConfig ?? null,
    journeyConfig: {
      id: 'journey-1',
      agentId: 'agent-1',
      enabled: overrides.enabled ?? false,
      journeyTrigger: 'FIRST_MESSAGE',
      followUpEnabled: false,
      cancelOnReply: true,
      followUpSteps: [],
      helpKeywords: overrides.helpKeywords ?? ['ajuda'],
      helpAutoEscalate: overrides.helpAutoEscalate ?? false,
      helpAckMessage: null,
      purchaseWebhookEnabled: false,
      waitingAckEnabled: overrides.waitingAckEnabled ?? true,
      waitingAckMessage: overrides.waitingAckMessage ?? WAITING_ACK_DEFAULT,
      humanReleaseKeyword: '#ia',
      idleCloseEnabled: false,
      idleCloseMinutes: 30,
      idleCloseMessage: '',
      createdAt: new Date(),
      updatedAt: new Date(),
    },
  } as AgentWithConfigsData;
}

function filterConfig(
  overrides: Partial<AgentFilterConfigData> = {},
): AgentFilterConfigData {
  return {
    id: 'filter-1',
    agentId: 'agent-1',
    allowedPhones: [],
    allowedGroups: [],
    triggerEnabled: false,
    triggerWords: [],
    triggerCaseSensitive: false,
    triggerRemoveFromText: false,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}
