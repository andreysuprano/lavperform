import { MessageFilterService } from './message-filter.service';
import { MessageType } from '../types/incoming-message.types';
import type { IncomingMessage } from '../types/incoming-message.types';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';

describe('MessageFilterService', () => {
  const humanTakeover = {
    isInTakeover: jest.fn(),
    setTakeover: jest.fn(),
  };

  const service = new MessageFilterService(humanTakeover as never);

  const baseMessage = {
    webhookEventId: 'evt-1',
    companyId: 'company-1',
    messageId: 'msg-1',
    chatId: '5511999999999',
    senderId: 'sender-1',
    senderName: 'Staff',
    senderPhone: '5511999999999',
    isFromMe: false,
    wasSentByApi: false,
    isGroup: false,
    timestamp: Date.now(),
    instanceName: 'inst-1',
    instanceToken: 'tok-1',
    type: MessageType.TEXT,
    text: 'ok, vou atender',
  } as IncomingMessage;

  const agentWithIgnore = {
    id: 'agent-1',
    filterConfig: null,
    notificationConfig: {
      helpNotificationEnabled: true,
      helpNotificationPhone: '5511999999999',
      helpNotificationIgnoreReplies: true,
    },
  } as unknown as AgentWithConfigsData;

  beforeEach(() => {
    jest.clearAllMocks();
    humanTakeover.isInTakeover.mockResolvedValue(false);
  });

  it('descarta mensagem do telefone de notificação quando ignore está ligado', async () => {
    const result = await service.checkAccess(baseMessage, agentWithIgnore);

    expect(result.allowed).toBe(false);
    expect(result.reason).toMatch(/ignorado/i);
  });

  it('descarta mesmo com DDI ausente no sender', async () => {
    const result = await service.checkAccess(
      { ...baseMessage, senderPhone: '11999999999', chatId: '11999999999' },
      agentWithIgnore,
    );

    expect(result.allowed).toBe(false);
  });

  it('permite mensagem do staff quando ignore está desligado', async () => {
    const agent = {
      ...agentWithIgnore,
      notificationConfig: {
        ...agentWithIgnore.notificationConfig,
        helpNotificationIgnoreReplies: false,
      },
    } as unknown as AgentWithConfigsData;

    const result = await service.checkAccess(baseMessage, agent);

    expect(result.allowed).toBe(true);
  });
});
