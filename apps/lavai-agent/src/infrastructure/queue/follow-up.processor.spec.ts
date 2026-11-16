import { Job } from 'bullmq';
import { JourneyTemplateService } from '../../application/customer-journey/services/journey-template.service';
import { FollowUpJobData } from './follow-up-queue.constants';
import { FollowUpProcessor } from './follow-up.processor';

describe('FollowUpProcessor', () => {
  const journey = {
    id: 'journey-1',
    conversationId: 'conv-1',
    status: 'ACTIVE',
  };

  const agent = {
    id: 'agent-1',
    active: true,
    journeyConfig: {
      followUpEnabled: true,
      followUpSteps: [
        {
          id: 'step-1',
          delayMinutes: 5,
          delayFrom: 'JOURNEY_START',
          message: 'Oi {nome}',
          askForHelp: false,
          active: true,
        },
      ],
    },
  };

  const conversation = {
    id: 'conv-1',
    userName: 'Ana',
    userPhone: '5511999999999',
    instanceName: 'inst-1',
    instanceToken: 'tok-1',
    chatId: 'chat-1',
  };

  const job = {
    data: {
      journeyId: 'journey-1',
      stepId: 'step-1',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      scheduledFor: '2026-10-27T15:00:00.000Z',
    },
  } as Job<FollowUpJobData>;

  function setup(secondStatus: string) {
    const journeyRepo = {
      findByConversationId: jest
        .fn()
        .mockResolvedValueOnce(journey)
        .mockResolvedValueOnce({ ...journey, status: secondStatus }),
    };
    const agentRepo = {
      findById: jest.fn().mockResolvedValue(agent),
    };
    const conversationRepo = {
      findById: jest.fn().mockResolvedValue(conversation),
      addMessage: jest.fn().mockResolvedValue({ id: 'msg-1' }),
    };
    const sender = { send: jest.fn().mockResolvedValue(undefined) };

    const processor = new FollowUpProcessor(
      journeyRepo as never,
      agentRepo as never,
      conversationRepo as never,
      sender,
      new JourneyTemplateService(),
    );

    return { processor, journeyRepo, conversationRepo, sender };
  }

  it('não envia quando a jornada deixa de estar ACTIVE imediatamente antes do envio', async () => {
    const { processor, journeyRepo, conversationRepo, sender } =
      setup('CLOSED');

    await processor.process(job);

    expect(sender.send).not.toHaveBeenCalled();
    expect(conversationRepo.addMessage).not.toHaveBeenCalled();
    expect(journeyRepo.findByConversationId).toHaveBeenCalledTimes(2);
    expect(
      journeyRepo.findByConversationId.mock.invocationCallOrder[1],
    ).toBeGreaterThan(conversationRepo.findById.mock.invocationCallOrder[0]);
  });

  it('envia o follow-up quando a releitura continua ACTIVE', async () => {
    const { processor, sender, conversationRepo } = setup('ACTIVE');

    await processor.process(job);

    expect(sender.send).toHaveBeenCalledWith(
      { instanceName: 'inst-1', instanceToken: 'tok-1', chatId: 'chat-1' },
      { type: 'text', text: 'Oi Ana' },
    );
    expect(conversationRepo.addMessage).toHaveBeenCalledWith({
      conversationId: 'conv-1',
      role: 'ASSISTANT',
      content: 'Oi Ana',
      originalType: 'FOLLOW_UP',
    });
  });
});
