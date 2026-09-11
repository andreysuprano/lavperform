import { AutomaticCampaignSlotRefillService, automaticCampaignRefillJobId } from 'src/automatic-campaign/application/automatic-campaign-slot-refill.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

describe('AutomaticCampaignSlotRefillService', () => {
  const queue: any = { add: jest.fn() };
  const prisma: any = {
    automaticCampaign: { findUnique: jest.fn() },
  };
  let service: AutomaticCampaignSlotRefillService;

  beforeEach(() => {
    jest.clearAllMocks();
    queue.add.mockResolvedValue({});
    service = new AutomaticCampaignSlotRefillService(prisma, queue);
  });

  it('enqueues a stable refill job when the campaign is active', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: null,
    });

    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'daily-duplicate',
    });

    expect(prisma.automaticCampaign.findUnique).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      select: { id: true, active: true, deletedAt: true },
    });
    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AUTOMATIC_CAMPAIGNS_ENGINE,
      { automaticCampaignId: 'ac1' },
      expect.objectContaining({
        jobId: automaticCampaignRefillJobId('ac1'),
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('does not enqueue when campaign is inactive', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: false,
      deletedAt: null,
    });

    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'paused',
    });

    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not enqueue when campaign is deleted or missing', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: new Date(),
    });
    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'deleted',
    });
    expect(queue.add).not.toHaveBeenCalled();

    prisma.automaticCampaign.findUnique.mockResolvedValue(null);
    await service.requestAfterAbort({
      automaticCampaignId: 'ac1',
      abortedMessageId: 'msg1',
      reason: 'missing',
    });
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('does not enqueue without automaticCampaignId', async () => {
    await service.requestAfterAbort({
      automaticCampaignId: null,
      abortedMessageId: 'msg1',
      reason: 'no-campaign',
    });
    expect(prisma.automaticCampaign.findUnique).not.toHaveBeenCalled();
    expect(queue.add).not.toHaveBeenCalled();
  });

  it('swallows duplicate jobId errors', async () => {
    prisma.automaticCampaign.findUnique.mockResolvedValue({
      id: 'ac1',
      active: true,
      deletedAt: null,
    });
    queue.add.mockRejectedValue(new Error('Job already exists'));

    await expect(
      service.requestAfterAbort({
        automaticCampaignId: 'ac1',
        abortedMessageId: 'msg1',
        reason: 'daily-duplicate',
      }),
    ).resolves.toBeUndefined();
  });
});
