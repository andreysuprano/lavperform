import { Job } from 'bullmq';
import { CustomerJourneyStatus } from '../../application/agent/ports/agent.repository.port';
import type {
  AgentJourneyConfigData,
  FollowUpStepData,
} from '../../application/agent/ports/agent.repository.port';
import type { CustomerJourneyData } from '../../application/customer-journey/ports/customer-journey.repository.port';
import {
  MessageRole,
  type ConversationMessageData,
} from '../../application/webhook/ports/conversation.repository.port';
import type { IdleCloseJobData } from './idle-close-queue.constants';
import { IdleCloseProcessor } from './idle-close.processor';

describe('IdleCloseProcessor', () => {
  const anchorCreatedAt = new Date('2026-10-27T12:00:00.000Z');
  const laterCreatedAt = new Date('2026-10-27T12:30:00.000Z');

  const steps: FollowUpStepData[] = [
    {
      id: 'step-1',
      delayMinutes: 10,
      delayFrom: 'JOURNEY_START',
      message: 'lembrete 1',
      askForHelp: false,
      active: true,
    },
    {
      id: 'step-2',
      delayMinutes: 20,
      delayFrom: 'PREVIOUS_STEP',
      message: 'lembrete 2',
      askForHelp: false,
      active: false,
    },
  ];

  const activeJourney: CustomerJourneyData = {
    id: 'journey-1',
    agentId: 'agent-1',
    conversationId: 'conv-1',
    userPhone: '5511999999999',
    status: CustomerJourneyStatus.ACTIVE,
    startedAt: new Date('2026-10-27T11:00:00.000Z'),
    purchaseAt: null,
    helpRequestedAt: null,
    metadata: {},
  };

  const conversation = {
    id: 'conv-1',
    chatId: 'chat-1',
    instanceName: 'inst-1',
    instanceToken: 'tok-1',
    userName: 'Ana',
    userPhone: '5511999999999',
  };

  const anchor: ConversationMessageData = {
    id: 'anchor-1',
    conversationId: 'conv-1',
    role: MessageRole.ASSISTANT,
    content: 'resposta de verdade',
    originalType: null,
    createdAt: anchorCreatedAt,
  };

  const job = {
    data: {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      anchorMessageId: 'anchor-1',
    },
    async updateData(data: IdleCloseJobData) {
      this.data = data;
    },
  } as Job<IdleCloseJobData>;

  beforeEach(() => {
    job.data = {
      conversationId: 'conv-1',
      agentId: 'agent-1',
      anchorMessageId: 'anchor-1',
    };
  });

  function buildAgent(
    journeyOverrides: Partial<AgentJourneyConfigData> = {},
    options: { active?: boolean; journeyConfig?: null } = {},
  ) {
    return {
      id: 'agent-1',
      active: options.active ?? true,
      persona: { messageSignature: '— Lav' },
      journeyConfig:
        options.journeyConfig === null
          ? null
          : {
              enabled: true,
              idleCloseEnabled: true,
              idleCloseMessage: 'Vou encerrar.',
              followUpSteps: steps,
              ...journeyOverrides,
            },
    };
  }

  function message(
    partial: Partial<ConversationMessageData>,
  ): ConversationMessageData {
    return {
      id: partial.id ?? 'msg-later',
      conversationId: partial.conversationId ?? 'conv-1',
      role: partial.role ?? MessageRole.ASSISTANT,
      content: partial.content ?? 'texto',
      originalType: partial.originalType ?? null,
      createdAt: partial.createdAt ?? laterCreatedAt,
    };
  }

  function createHarness(
    options: {
      journey?: CustomerJourneyData | null;
      reread?: CustomerJourneyData | null;
      agent?: ReturnType<typeof buildAgent> | null;
      conversation?: typeof conversation | null;
      anchor?: ConversationMessageData | null;
      later?: ConversationMessageData[];
      takeover?: boolean;
      sendError?: Error;
    } = {},
  ) {
    const journey =
      options.journey === undefined ? activeJourney : options.journey;
    const reread = options.reread === undefined ? journey : options.reread;
    const agent = options.agent === undefined ? buildAgent() : options.agent;
    const currentConversation =
      options.conversation === undefined ? conversation : options.conversation;
    const currentAnchor =
      options.anchor === undefined ? anchor : options.anchor;

    const journeyRepo = {
      findByConversationId: jest
        .fn()
        .mockResolvedValueOnce(journey)
        .mockResolvedValueOnce(reread),
      updateStatus: jest.fn().mockResolvedValue({
        ...activeJourney,
        status: CustomerJourneyStatus.CLOSED,
      }),
    };
    const agentRepo = { findById: jest.fn().mockResolvedValue(agent) };
    const conversationRepo = {
      findById: jest.fn().mockResolvedValue(currentConversation),
      findMessageById: jest.fn().mockResolvedValue(currentAnchor),
      findMessagesAfter: jest.fn().mockResolvedValue(options.later ?? []),
      addMessage: jest.fn().mockResolvedValue({ id: 'idle-msg-1' }),
    };
    const sender = {
      send: options.sendError
        ? jest.fn().mockRejectedValue(options.sendError)
        : jest.fn().mockResolvedValue(undefined),
    };
    const followUpScheduler = {
      cancelForJourney: jest.fn().mockResolvedValue(undefined),
    };
    const takeover = {
      isInTakeover: jest.fn().mockResolvedValue(options.takeover ?? false),
    };

    const processor = new IdleCloseProcessor(
      journeyRepo as never,
      agentRepo as never,
      conversationRepo as never,
      sender,
      followUpScheduler as never,
      takeover as never,
    );

    return {
      processor,
      journeyRepo,
      conversationRepo,
      sender,
      followUpScheduler,
      takeover,
    };
  }

  async function expectNoSendAndNoClose(
    options: Parameters<typeof createHarness>[0],
  ): Promise<void> {
    const { processor, sender, journeyRepo, conversationRepo } =
      createHarness(options);

    await processor.process(job);

    expect(sender.send).not.toHaveBeenCalled();
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
  }

  it('cancela o follow-up, envia sem assinatura, grava IDLE_CLOSE e fecha a jornada', async () => {
    const {
      processor,
      journeyRepo,
      conversationRepo,
      sender,
      followUpScheduler,
      takeover,
    } = createHarness({
      later: [
        message({
          id: 'ack-1',
          originalType: 'WAITING_ACK',
          content: 'um momento',
        }),
        message({
          id: 'follow-1',
          originalType: 'FOLLOW_UP',
          content: 'ainda está aí?',
        }),
      ],
    });

    await processor.process(job);

    expect(takeover.isInTakeover).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(conversationRepo.findMessagesAfter).toHaveBeenCalledWith(
      'conv-1',
      anchorCreatedAt,
    );
    expect(followUpScheduler.cancelForJourney).toHaveBeenCalledWith(
      'journey-1',
      ['step-1', 'step-2'],
    );
    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(sender.send).toHaveBeenCalledWith(
      { instanceName: 'inst-1', instanceToken: 'tok-1', chatId: 'chat-1' },
      { type: 'text', text: 'Vou encerrar.' },
    );
    expect(conversationRepo.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      role: MessageRole.ASSISTANT,
      content: 'Vou encerrar.',
      originalType: 'IDLE_CLOSE',
    });
    expect(journeyRepo.updateStatus).toHaveBeenCalledWith(
      'journey-1',
      'CLOSED',
    );
    expect(journeyRepo.findByConversationId).toHaveBeenCalledTimes(2);
    expect(
      followUpScheduler.cancelForJourney.mock.invocationCallOrder[0],
    ).toBeLessThan(
      journeyRepo.findByConversationId.mock.invocationCallOrder[1],
    );
    expect(
      journeyRepo.findByConversationId.mock.invocationCallOrder[1],
    ).toBeLessThan(sender.send.mock.invocationCallOrder[0]);
    expect(sender.send.mock.invocationCallOrder[0]).toBeLessThan(
      conversationRepo.addMessage.mock.invocationCallOrder[0],
    );
    expect(
      conversationRepo.addMessage.mock.invocationCallOrder[0],
    ).toBeLessThan(journeyRepo.updateStatus.mock.invocationCallOrder[0]);
  });

  it('não envia de novo quando IDLE_CLOSE já existe e marca CLOSED se a jornada segue ACTIVE', async () => {
    const {
      processor,
      sender,
      journeyRepo,
      conversationRepo,
      followUpScheduler,
    } = createHarness({
      later: [
        message({
          id: 'follow-1',
          originalType: 'FOLLOW_UP',
          content: 'ainda está aí?',
        }),
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });

    await processor.process(job);

    expect(sender.send).not.toHaveBeenCalled();
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(followUpScheduler.cancelForJourney).not.toHaveBeenCalled();
    expect(journeyRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(journeyRepo.updateStatus).toHaveBeenCalledWith(
      'journey-1',
      'CLOSED',
    );
  });

  it('não marca CLOSED de novo quando o IDLE_CLOSE já existe e a jornada já está CLOSED', async () => {
    await expectNoSendAndNoClose({
      journey: { ...activeJourney, status: CustomerJourneyStatus.CLOSED },
      later: [
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });
  });

  it('não envia nem fecha quando a releitura da jornada já não está ACTIVE', async () => {
    const {
      processor,
      sender,
      journeyRepo,
      conversationRepo,
      followUpScheduler,
    } = createHarness({
      reread: { ...activeJourney, status: CustomerJourneyStatus.CLOSED },
    });

    await processor.process(job);

    expect(followUpScheduler.cancelForJourney).toHaveBeenCalledWith(
      'journey-1',
      ['step-1', 'step-2'],
    );
    expect(sender.send).not.toHaveBeenCalled();
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('não fecha quando o envio falha', async () => {
    const { processor, journeyRepo, conversationRepo } = createHarness({
      sendError: new Error('falha no envio'),
    });

    await expect(processor.process(job)).rejects.toThrow('falha no envio');

    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('não reenvia quando addMessage falha depois do send e fecha no retry', async () => {
    const { processor, sender, journeyRepo, conversationRepo } = createHarness();
    journeyRepo.findByConversationId.mockResolvedValue(activeJourney);
    conversationRepo.addMessage.mockRejectedValueOnce(
      new Error('falha ao gravar'),
    );

    await expect(processor.process(job)).rejects.toThrow('falha ao gravar');

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(conversationRepo.addMessage).toHaveBeenCalledTimes(1);
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
    expect(job.data.closeTextSent).toBe(true);

    await processor.process(job);

    expect(sender.send).toHaveBeenCalledTimes(1);
    expect(conversationRepo.addMessage).toHaveBeenCalledTimes(2);
    expect(journeyRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(journeyRepo.updateStatus).toHaveBeenCalledWith(
      'journey-1',
      'CLOSED',
    );
  });

  it('não encerra em atendimento humano', async () => {
    await expectNoSendAndNoClose({
      takeover: true,
      later: [
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });
  });

  it('não encerra quando a jornada não está ACTIVE', async () => {
    await expectNoSendAndNoClose({
      journey: {
        ...activeJourney,
        status: CustomerJourneyStatus.HELP_REQUESTED,
      },
      later: [
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });
  });

  it('não encerra quando o agente está inativo', async () => {
    await expectNoSendAndNoClose({
      agent: buildAgent({}, { active: false }),
      later: [
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });
  });

  it('não encerra quando o encerramento está desligado', async () => {
    await expectNoSendAndNoClose({
      agent: buildAgent({ idleCloseEnabled: false }),
    });
  });

  it('não encerra quando a jornada geral está desligada', async () => {
    await expectNoSendAndNoClose({
      agent: buildAgent({ enabled: false }),
    });
  });

  it('não encerra quando o agente não tem configuração de jornada', async () => {
    await expectNoSendAndNoClose({
      agent: buildAgent({}, { journeyConfig: null }),
    });
  });

  it.each(['', '   '])(
    'não encerra quando o texto de encerramento é "%s"',
    async (idleCloseMessage) => {
      await expectNoSendAndNoClose({
        agent: buildAgent({ idleCloseMessage }),
      });
    },
  );

  it('não encerra quando o cliente falou depois da âncora', async () => {
    await expectNoSendAndNoClose({
      later: [
        message({
          id: 'user-1',
          role: MessageRole.USER,
          originalType: 'TEXT',
          content: 'ainda preciso de ajuda',
        }),
        message({
          id: 'idle-1',
          originalType: 'IDLE_CLOSE',
          content: 'Vou encerrar.',
        }),
      ],
    });
  });

  it.each([null, 'TEXT'])(
    'não encerra quando há resposta de verdade mais nova (originalType=%s)',
    async (originalType) => {
      await expectNoSendAndNoClose({
        later: [
          message({
            id: 'reply-1',
            role: MessageRole.ASSISTANT,
            originalType,
            content: 'nova resposta',
          }),
          message({
            id: 'idle-1',
            originalType: 'IDLE_CLOSE',
            content: 'Vou encerrar.',
          }),
        ],
      });
    },
  );

  it('não encerra quando a âncora é de outra conversa', async () => {
    const { processor, sender, journeyRepo, conversationRepo } = createHarness({
      anchor: { ...anchor, conversationId: 'conv-2' },
    });

    await processor.process(job);

    expect(conversationRepo.findMessagesAfter).not.toHaveBeenCalled();
    expect(sender.send).not.toHaveBeenCalled();
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('não encerra quando a âncora não existe', async () => {
    await expectNoSendAndNoClose({ anchor: null });
  });

  it.each([
    ['jornada', { journey: null }],
    ['agente', { agent: null }],
    ['conversa', { conversation: null }],
  ] as const)('não encerra quando a %s não existe', async (_label, options) => {
    await expectNoSendAndNoClose(options);
  });
});
