import { AutomaticCampaignStatus } from '@prisma/client';
import { AutomaticCampaignTasks } from 'src/automatic-campaign/crons/automatic-campaign-tasks';

describe('AutomaticCampaignTasks', () => {
  const automaticCampaignsQueue: any = { add: jest.fn() };
  const prisma: any = {
    automaticCampaign: {
      findMany: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
    },
    cron_automatic_campaign: {
      create: jest.fn(),
    },
  };

  let tasks: AutomaticCampaignTasks;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-02-02T10:00:00.000Z'));
    jest.clearAllMocks();
    tasks = new AutomaticCampaignTasks(prisma, automaticCampaignsQueue);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('queues campaigns filtered by status (ignores active flag) and updates lastProcessedAt', async () => {
    prisma.automaticCampaign.findMany = jest.fn().mockResolvedValue([
      { id: 'ac1', name: 'Auto 1' },
      { id: 'ac2', name: 'Auto 2' },
    ]);
    prisma.cron_automatic_campaign.create = jest.fn().mockResolvedValue({ id: 'cron1' });
    prisma.automaticCampaign.update = jest.fn().mockResolvedValue({ id: 'ac1' });
    automaticCampaignsQueue.add = jest.fn().mockResolvedValue(undefined);

    await tasks.handleAutomaticCampaign();

    expect(prisma.automaticCampaign.findMany).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: {
          in: [
            AutomaticCampaignStatus.PROCESSING,
            AutomaticCampaignStatus.IN_PROGRESS,
          ],
        },
        startDate: { lte: expect.any(Date) },
        deletedAt: null,
        AND: expect.any(Array),
      }),
    });
    const findManyArgs = (prisma.automaticCampaign.findMany as jest.Mock).mock.calls[0][0];
    expect(findManyArgs.where.active).toBeUndefined();
    expect(prisma.cron_automatic_campaign.create).toHaveBeenCalledWith({ data: { campaignsFound: 2 } });
    expect(automaticCampaignsQueue.add).toHaveBeenCalledTimes(2);
    expect(prisma.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: { lastProcessedAt: expect.any(Date) },
    });
  });

  it('logs error without throwing', async () => {
    prisma.automaticCampaign.findMany = jest.fn().mockRejectedValue(new Error('db error'));

    await expect(tasks.handleAutomaticCampaign()).resolves.toBeUndefined();
    expect(automaticCampaignsQueue.add).not.toHaveBeenCalled();
  });

  describe('handleEndedCampaigns', () => {
    it('marks expired campaigns as COMPLETED and inactive', async () => {
      prisma.automaticCampaign.updateMany = jest.fn().mockResolvedValue({ count: 3 });

      await tasks.handleEndedCampaigns();

      expect(prisma.automaticCampaign.updateMany).toHaveBeenCalledWith({
        where: {
          endDate: { lt: expect.any(Date) },
          status: { not: AutomaticCampaignStatus.COMPLETED },
          deletedAt: null,
        },
        data: {
          status: AutomaticCampaignStatus.COMPLETED,
          active: false,
        },
      });
    });

    it('logs error without throwing', async () => {
      prisma.automaticCampaign.updateMany = jest.fn().mockRejectedValue(new Error('db error'));

      await expect(tasks.handleEndedCampaigns()).resolves.toBeUndefined();
    });
  });
});
