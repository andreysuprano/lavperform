import { HelpEscalationService } from './help-escalation.service';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';

describe('HelpEscalationService', () => {
  const journeyRepo = {
    findByConversationId: jest.fn(),
    updateStatus: jest.fn(),
  };
  const helpRequestRepo = {
    findPendingDuplicate: jest.fn(),
    create: jest.fn(),
  };
  const humanTakeover = {
    setTakeover: jest.fn(),
  };
  const followUpScheduler = {
    cancelForJourney: jest.fn(),
  };
  const attendantGateway = {
    emitHelpRequested: jest.fn(),
  };
  const messageSender = {
    send: jest.fn(),
  };

  const service = new HelpEscalationService(
    journeyRepo as never,
    helpRequestRepo as never,
    humanTakeover as never,
    followUpScheduler as never,
    attendantGateway as never,
    messageSender as never,
  );

  const conversation = {
    id: 'conv-1',
    companyId: 'company-1',
    userName: 'Maria',
    userPhone: '5511888777666',
    chatId: '5511888777666',
    instanceName: 'inst-1',
    instanceToken: 'tok-1',
  };

  const baseAgent = {
    id: 'agent-1',
    journeyConfig: {
      followUpSteps: [],
      helpAckMessage: null,
    },
    notificationConfig: null,
  } as unknown as AgentWithConfigsData;

  beforeEach(() => {
    jest.clearAllMocks();
    journeyRepo.findByConversationId.mockResolvedValue(null);
    helpRequestRepo.findPendingDuplicate.mockResolvedValue(null);
    helpRequestRepo.create.mockResolvedValue({
      id: 'help-1',
      requestedAt: new Date('2026-08-05T12:00:00.000Z'),
    });
    humanTakeover.setTakeover.mockResolvedValue(undefined);
    messageSender.send.mockResolvedValue(undefined);
  });

  it('não envia alerta ao staff sem notificationConfig', async () => {
    await service.escalate({
      agent: baseAgent,
      conversation: conversation as never,
      lastMessage: 'quero atendente',
    });

    expect(messageSender.send).not.toHaveBeenCalled();
    expect(attendantGateway.emitHelpRequested).toHaveBeenCalled();
  });

  it('envia alerta ao staff quando enabled + phone', async () => {
    const agent = {
      ...baseAgent,
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
      },
    } as unknown as AgentWithConfigsData;

    await service.escalate({
      agent,
      conversation: conversation as never,
      lastMessage: 'preciso de ajuda',
    });

    expect(messageSender.send).toHaveBeenCalledWith(
      {
        instanceName: 'inst-1',
        instanceToken: 'tok-1',
        chatId: '5511999999999',
      },
      expect.objectContaining({
        type: 'text',
        text: expect.stringContaining('Um cliente solicitou atendimento humano.'),
      }),
    );
  });

  it('não aborta escalação se envio ao staff falhar', async () => {
    const agent = {
      ...baseAgent,
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
      },
    } as unknown as AgentWithConfigsData;

    messageSender.send.mockRejectedValue(new Error('uazapi down'));

    const result = await service.escalate({
      agent,
      conversation: conversation as never,
      lastMessage: 'ajuda',
    });

    expect(result).toEqual({ helpRequestId: 'help-1', alreadyEscalated: false });
    expect(attendantGateway.emitHelpRequested).toHaveBeenCalled();
  });

  it('ainda notifica staff se o ACK ao cliente falhar', async () => {
    const agent = {
      ...baseAgent,
      journeyConfig: {
        followUpSteps: [],
        helpAckMessage: 'Aguarde um atendente',
      },
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
      },
    } as unknown as AgentWithConfigsData;

    messageSender.send
      .mockRejectedValueOnce(new Error('ack failed'))
      .mockResolvedValueOnce(undefined);

    const result = await service.escalate({
      agent,
      conversation: conversation as never,
      lastMessage: 'ajuda',
    });

    expect(result).toEqual({ helpRequestId: 'help-1', alreadyEscalated: false });
    expect(messageSender.send).toHaveBeenCalledTimes(2);
    expect(messageSender.send).toHaveBeenLastCalledWith(
      {
        instanceName: 'inst-1',
        instanceToken: 'tok-1',
        chatId: '5511999999999',
      },
      expect.objectContaining({ type: 'text' }),
    );
    expect(attendantGateway.emitHelpRequested).toHaveBeenCalled();
  });

  it('não reenvia alerta quando alreadyEscalated', async () => {
    helpRequestRepo.findPendingDuplicate.mockResolvedValue({ id: 'dup-1' });

    const agent = {
      ...baseAgent,
      notificationConfig: {
        helpNotificationEnabled: true,
        helpNotificationPhone: '5511999999999',
      },
    } as unknown as AgentWithConfigsData;

    const result = await service.escalate({
      agent,
      conversation: conversation as never,
      lastMessage: 'ajuda',
    });

    expect(result.alreadyEscalated).toBe(true);
    expect(messageSender.send).not.toHaveBeenCalled();
  });
});
