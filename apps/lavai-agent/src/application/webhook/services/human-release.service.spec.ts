import { HumanReleaseService } from './human-release.service';

describe('HumanReleaseService', () => {
  const takeover = { clearTakeover: jest.fn() };
  const conversations = {
    findByAgentAndChat: jest.fn().mockResolvedValue([{ id: 'conv-1' }]),
  };
  const journeys = {
    findByConversationId: jest.fn().mockResolvedValue({
      id: 'journey-1',
      status: 'ESCALATED',
    }),
    updateStatus: jest.fn(),
  };
  const helpRequests = {
    findOpenByAgentAndChat: jest.fn().mockResolvedValue([
      { id: 'help-1', status: 'PENDING' },
      { id: 'help-2', status: 'CLAIMED' },
    ]),
    updateStatus: jest.fn(),
  };

  const service = new HumanReleaseService(
    takeover as never,
    conversations as never,
    journeys as never,
    helpRequests as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('volta a jornada escalada para ACTIVE e resolve os pedidos abertos', async () => {
    await service.release('agent-1', 'chat-1');

    expect(takeover.clearTakeover).toHaveBeenCalledWith('agent-1', 'chat-1');
    expect(journeys.updateStatus).toHaveBeenCalledWith('journey-1', 'ACTIVE');
    expect(helpRequests.updateStatus).toHaveBeenCalledWith('help-1', 'RESOLVED', {
      resolvedAt: expect.any(Date),
    });
    expect(helpRequests.updateStatus).toHaveBeenCalledWith('help-2', 'RESOLVED', {
      resolvedAt: expect.any(Date),
    });
  });

  it('não mexe em jornada ACTIVE nem PURCHASED', async () => {
    journeys.findByConversationId.mockResolvedValueOnce({ id: 'journey-2', status: 'PURCHASED' });
    await service.release('agent-1', 'chat-1');
    expect(journeys.updateStatus).not.toHaveBeenCalled();
  });
});
