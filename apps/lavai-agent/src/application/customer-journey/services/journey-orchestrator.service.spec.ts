import { ConfigService } from '@nestjs/config';
import {
  CustomerJourneyStatus,
  JourneyTrigger,
} from '../../agent/ports/agent.repository.port';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import type { CustomerJourneyData } from '../ports/customer-journey.repository.port';
import { JourneyOrchestratorService } from './journey-orchestrator.service';

describe('JourneyOrchestratorService', () => {
  const TEN_MINUTES_MS = 10 * 60 * 1000;

  const agent = {
    id: 'agent-1',
    journeyConfig: {
      enabled: true,
      journeyTrigger: JourneyTrigger.FIRST_MESSAGE,
      followUpEnabled: true,
      cancelOnReply: true,
      followUpSteps: [{ id: 'step-1', delayMinutes: 5, delayFrom: 'JOURNEY_START', active: true }],
      helpKeywords: ['ajuda'],
      helpAutoEscalate: true,
      helpAckMessage: 'Aguarde',
      purchaseWebhookEnabled: true,
    },
  } as AgentWithConfigsData;

  const conversation = {
    id: 'conv-1',
    userPhone: '5511999999999',
  } as Parameters<JourneyOrchestratorService['onInboundMessage']>[0]['conversation'];

  function buildJourney(overrides: Partial<CustomerJourneyData> = {}): CustomerJourneyData {
    return {
      id: 'journey-1',
      agentId: 'agent-1',
      conversationId: 'conv-1',
      userPhone: '5511999999999',
      status: CustomerJourneyStatus.HELP_REQUESTED,
      startedAt: new Date('2026-01-01T12:00:00.000Z'),
      purchaseAt: null,
      helpRequestedAt: new Date(Date.now() - TEN_MINUTES_MS - 1000),
      metadata: {},
      ...overrides,
    };
  }

  function createService(journey: CustomerJourneyData | null) {
    const journeyRepo = {
      findByConversationId: jest.fn().mockResolvedValue(journey),
      create: jest.fn(),
      updateStatus: jest.fn().mockImplementation((_id, status) =>
        Promise.resolve({ ...journey!, status }),
      ),
    };
    const followUpScheduler = {
      cancelForJourney: jest.fn().mockResolvedValue(undefined),
      scheduleForJourney: jest.fn().mockResolvedValue(undefined),
    };
    const helpEscalation = {
      escalate: jest.fn(),
    };
    const configService = {
      get: jest.fn().mockReturnValue(TEN_MINUTES_MS),
    } as unknown as ConfigService;

    const service = new JourneyOrchestratorService(
      journeyRepo as never,
      followUpScheduler as never,
      helpEscalation as never,
      configService,
    );

    return { service, journeyRepo, followUpScheduler, helpEscalation };
  }

  it('libera a IA após 10 minutos em HELP_REQUESTED', async () => {
    const journey = buildJourney();
    const { service, journeyRepo, followUpScheduler } = createService(journey);

    const result = await service.onInboundMessage({
      agent,
      conversation,
      message: 'oi, quero pedir',
    });

    expect(result).toEqual({ skipLlm: false, escalated: false });
    expect(followUpScheduler.cancelForJourney).toHaveBeenCalledWith('journey-1', ['step-1']);
    expect(journeyRepo.updateStatus).toHaveBeenCalledTimes(1);
    expect(journeyRepo.updateStatus).toHaveBeenCalledWith(
      'journey-1',
      CustomerJourneyStatus.CLOSED,
    );
    expect(followUpScheduler.scheduleForJourney).not.toHaveBeenCalled();
  });

  it('continua bloqueando a IA antes de 10 minutos em HELP_REQUESTED', async () => {
    const journey = buildJourney({
      helpRequestedAt: new Date(Date.now() - 5 * 60 * 1000),
    });
    const { service, journeyRepo } = createService(journey);

    const result = await service.onInboundMessage({
      agent,
      conversation,
      message: 'oi',
    });

    expect(result).toEqual({ skipLlm: true, escalated: false });
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
  });

  it('reabre jornada CLOSED na mensagem de texto e agenda o follow-up', async () => {
    const journey = buildJourney({
      status: CustomerJourneyStatus.CLOSED,
      helpRequestedAt: null,
    });
    const { service, journeyRepo, followUpScheduler } = createService(journey);

    const result = await service.onInboundMessage({
      agent,
      conversation,
      message: 'oi de novo',
    });

    expect(result).toEqual({ skipLlm: false, escalated: false });
    expect(journeyRepo.updateStatus).toHaveBeenCalledWith('journey-1', CustomerJourneyStatus.ACTIVE, {
      startedAt: expect.any(Date),
    });
    const startedAt = journeyRepo.updateStatus.mock.calls[0][2].startedAt as Date;
    expect(followUpScheduler.scheduleForJourney).toHaveBeenCalledWith(
      'journey-1',
      'agent-1',
      'conv-1',
      agent.journeyConfig!.followUpSteps,
      startedAt,
    );
    expect(followUpScheduler.cancelForJourney).toHaveBeenCalledWith('journey-1', ['step-1']);
    expect(followUpScheduler.cancelForJourney.mock.invocationCallOrder[0]).toBeLessThan(
      followUpScheduler.scheduleForJourney.mock.invocationCallOrder[0],
    );
  });

  it('não reabre jornada PURCHASED', async () => {
    const journey = buildJourney({ status: CustomerJourneyStatus.PURCHASED });
    const { service, journeyRepo, followUpScheduler } = createService(journey);

    const result = await service.onInboundMessage({
      agent,
      conversation,
      message: 'oi',
    });

    expect(result).toEqual({ skipLlm: false, escalated: false });
    expect(journeyRepo.updateStatus).not.toHaveBeenCalled();
    expect(followUpScheduler.scheduleForJourney).not.toHaveBeenCalled();
  });
});
