import { CampaignStatus } from '@prisma/client';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { ScheduledCampaignTasks } from 'src/campaigns/crons/scheduled-campaign-tasks';

describe('ScheduledCampaignTasks', () => {
  const campaignsQueue: any = {
    add: jest.fn(),
  };
  const prisma: any = {
    campaign: {
      findMany: jest.fn(),
    },
  };

  let tasks: ScheduledCampaignTasks;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    jest.clearAllMocks();
    tasks = new ScheduledCampaignTasks(prisma, campaignsQueue);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enqueues waiting campaigns scheduled near now', async () => {
    prisma.campaign.findMany = jest.fn().mockResolvedValue([
      { id: 'camp1', name: 'Camp 1', scheduledDate: new Date('2024-01-01T12:00:00.000Z') },
      { id: 'camp2', name: 'Camp 2', scheduledDate: new Date('2024-01-01T12:01:00.000Z') },
    ]);
    campaignsQueue.add = jest.fn().mockResolvedValue(undefined);

    await tasks.handleScheduledCampaign();

    expect(prisma.campaign.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        scheduledDate: expect.objectContaining({
          gte: expect.any(Date),
          lte: expect.any(Date),
        }),
        status: CampaignStatus.WAITING,
      }),
    });
    expect(campaignsQueue.add).toHaveBeenCalledTimes(2);
    expect(campaignsQueue.add).toHaveBeenCalledWith(QUEUE_NAMES.CAMPAIGNS_ENGINE, { campaignId: 'camp1' });
  });

  it('handles errors gracefully', async () => {
    prisma.campaign.findMany = jest.fn().mockRejectedValue(new Error('db'));

    await expect(tasks.handleScheduledCampaign()).resolves.toBeUndefined();
    expect(campaignsQueue.add).not.toHaveBeenCalled();
  });
});
