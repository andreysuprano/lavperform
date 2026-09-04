import { AutomaticCampaignStatus, CampaignChannel, MessageStatus } from '@prisma/client';

const getDayOfWeekPtBrMock = jest.fn().mockReturnValue('seg');
const nowUTCMock = jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00.000Z'));
const FIXED_START = new Date('2024-01-01T03:00:00.000Z');
const FIXED_END = new Date('2024-01-02T02:59:59.999Z');

jest.mock('src/common/utils/date.utils', () => ({
  getDayOfWeekPtBr: getDayOfWeekPtBrMock,
  getRandomTimeInRangeForOpeningHours: jest.fn().mockReturnValue(new Date('2024-01-01T12:00:00.000Z')),
  nowUTC: nowUTCMock,
  startOfDayInTz: jest.fn().mockReturnValue(FIXED_START),
  endOfDayInTz: jest.fn().mockReturnValue(FIXED_END),
}));

import { AutomaticCampaignsProcessor } from 'src/automatic-campaign/infrastructure/jobs/automatic-campaigns.processor';
import { getDayOfWeekPtBr } from 'src/common/utils/date.utils';

describe('AutomaticCampaignsProcessor', () => {
  const prisma: any = {
    automaticCampaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    openingHours: {
      findFirst: jest.fn(),
    },
    customer: {
      count: jest.fn(),
      findMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
      count: jest.fn().mockResolvedValue(0),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    campaignMetric: {
      updateMany: jest.fn(),
    },
  };

  const strategy = { generateMessages: jest.fn() };
  const factory: any = { get: jest.fn().mockReturnValue(strategy) };
  const renitencyEvaluator: any = {
    canContactCustomer: jest.fn().mockResolvedValue({ allowed: true }),
  };
  const campaignCustomerResolver: any = {
    resolveCustomers: jest.fn(),
    countEligibleCustomers: jest.fn(),
  };
  const customersService: any = {
    enqueueStaleWhatsappValidationForCompany: jest.fn().mockResolvedValue(undefined),
  };
  const dailyGuard: any = {
    loadDailySnapshot: jest.fn(),
  };

  let processor: AutomaticCampaignsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    strategy.generateMessages.mockReset();
    factory.get.mockReturnValue(strategy);
    prisma.message.count.mockResolvedValue(0);
    renitencyEvaluator.canContactCustomer.mockResolvedValue({ allowed: true });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(0);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([]);
    dailyGuard.loadDailySnapshot.mockResolvedValue({
      tryReserve: jest.fn().mockReturnValue({ allowed: true }),
    });
    processor = new AutomaticCampaignsProcessor(
      prisma,
      factory,
      renitencyEvaluator,
      campaignCustomerResolver,
      customersService,
      dailyGuard,
    );
  });

  it('skips when campaign day is not allowed', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValueOnce('dom');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      daysOfWeek: ['seg'],
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
    });

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(campaignCustomerResolver.resolveCustomers).not.toHaveBeenCalled();
    expect(strategy.generateMessages).not.toHaveBeenCalled();
  });

  it('delegates to the channel strategy and transitions PROCESSING to IN_PROGRESS on first success', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');

    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA,segB',
      daysOfWeek: ['seg'],
      images: 'img1,img2',
      messageText: 'Hi',
      maxDailySends: 50,
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.PROCESSING,
      creatives: [],
      coupon: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      { id: 'cust1', name: 'A', phone: '1' },
      { id: 'cust2', name: 'B', phone: '2' },
    ]);
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.automaticCampaign.update = jest.fn().mockResolvedValue({});
    strategy.generateMessages.mockResolvedValue(undefined);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(factory.get).toHaveBeenCalledWith(CampaignChannel.WHATSAPP_WEB);
    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.campaign.id).toBe('ac1');
    expect(ctx.customers).toHaveLength(2);
    expect(ctx.maxDailySends).toBe(50);
    expect(ctx.sendTimeWindow).toEqual({
      openTime: '10:00',
      closeTime: '18:00',
      mode: 'random',
    });
    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { totalCustomers: 2 },
    });
    expect(campaignCustomerResolver.resolveCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 250,
        companyId: 'comp1',
        targetingMode: 'RFV',
      }),
    );
    expect(prisma.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: expect.objectContaining({
        status: AutomaticCampaignStatus.IN_PROGRESS,
      }),
    });
  });

  it('does not change status when already IN_PROGRESS', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');

    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA',
      daysOfWeek: ['seg'],
      images: 'img1',
      messageText: 'Hi',
      maxDailySends: 50,
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
      creatives: [],
      coupon: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(0);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([]);
    prisma.campaignMetric.updateMany = jest.fn();
    prisma.automaticCampaign.update = jest.fn();
    strategy.generateMessages.mockResolvedValue(undefined);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    const statusUpdates = prisma.automaticCampaign.update.mock.calls.filter(
      ([args]: [{ data?: { status?: string } }]) => args.data?.status !== undefined,
    );
    expect(statusUpdates).toHaveLength(0);
  });

  it('skips when daily limit is already reached', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA',
      daysOfWeek: ['seg'],
      messageText: 'Hi',
      maxDailySends: 10,
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
      creatives: [],
      coupon: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    prisma.message.count = jest.fn().mockResolvedValue(10);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(strategy.generateMessages).not.toHaveBeenCalled();
    expect(campaignCustomerResolver.resolveCustomers).not.toHaveBeenCalled();
  });

  it('handles missing campaign gracefully', async () => {
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(null);

    await processor.process({ data: { automaticCampaignId: 'missing' } } as any);

    expect(campaignCustomerResolver.resolveCustomers).not.toHaveBeenCalled();
    expect(strategy.generateMessages).not.toHaveBeenCalled();
  });

  it('skips when opening hours closed', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA',
      daysOfWeek: ['seg'],
      images: 'img1',
      messageText: 'Hi',
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
      creatives: [],
      coupon: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({ isOpen: false });

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(campaignCustomerResolver.resolveCustomers).not.toHaveBeenCalled();
    expect(strategy.generateMessages).not.toHaveBeenCalled();
  });

  it('runs with custom schedule even when establishment is closed', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA',
      daysOfWeek: ['seg'],
      messageText: 'Hi',
      maxDailySends: 50,
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
      creatives: [],
      coupon: null,
      sendTimeStart: '14:00',
      sendTimeEnd: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({ isOpen: false });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      { id: 'c1', name: 'A', phone: '1' },
    ]);
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    strategy.generateMessages.mockResolvedValue(undefined);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
    expect(strategy.generateMessages.mock.calls[0][0].sendTimeWindow).toEqual({
      openTime: '14:00',
      closeTime: '14:00',
      mode: 'fixed',
    });
  });

  it('marks PROCESSING campaign as FAILED when strategy throws', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest
      .fn()
      .mockResolvedValueOnce({
        id: 'ac1',
        companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
        segmentation: 'segA',
        daysOfWeek: ['seg'],
        messageText: 'Hi',
        maxDailySends: 50,
        channel: CampaignChannel.WHATSAPP_WEB,
        status: AutomaticCampaignStatus.PROCESSING,
        creatives: [],
        coupon: null,
      })
      .mockResolvedValueOnce({ status: AutomaticCampaignStatus.PROCESSING });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      { id: 'c1', name: 'A', phone: '1' },
    ]);
    prisma.automaticCampaign.update = jest.fn().mockResolvedValue({});
    strategy.generateMessages.mockRejectedValue(new Error('boom'));

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(prisma.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: expect.objectContaining({
        status: AutomaticCampaignStatus.FAILED,
      }),
    });
  });

  it('excludes candidates blocked by the daily guard from message generation', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');

    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      companyId: 'comp1',
      active: true,
      targetingMode: 'RFV',
      segmentation: 'segA',
      daysOfWeek: ['seg'],
      messageText: 'Hi',
      maxDailySends: 50,
      channel: CampaignChannel.WHATSAPP_WEB,
      status: AutomaticCampaignStatus.IN_PROGRESS,
      creatives: [],
      coupon: null,
    });
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      { id: 'cust-blocked', name: 'Blocked', phone: '1' },
      { id: 'cust-allowed', name: 'Allowed', phone: '2' },
    ]);
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.automaticCampaign.update = jest.fn().mockResolvedValue({});
    strategy.generateMessages.mockResolvedValue(undefined);

    const tryReserve = jest.fn(({ customerId }) =>
      customerId === 'cust-blocked'
        ? { allowed: false, blockerId: 'existing-msg' }
        : { allowed: true },
    );
    dailyGuard.loadDailySnapshot.mockResolvedValue({ tryReserve });

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(dailyGuard.loadDailySnapshot).toHaveBeenCalledTimes(1);
    expect(dailyGuard.loadDailySnapshot).toHaveBeenCalledWith({
      companyId: 'comp1',
      now: expect.any(Date),
    });
    expect(tryReserve).toHaveBeenCalledWith({
      id: 'candidate:cust-blocked',
      customerId: 'cust-blocked',
      phone: '1',
    });
    expect(tryReserve).toHaveBeenCalledWith({
      id: 'candidate:cust-allowed',
      customerId: 'cust-allowed',
      phone: '2',
    });
    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
    expect(strategy.generateMessages.mock.calls[0][0].customers).toEqual([
      { id: 'cust-allowed', name: 'Allowed', phone: '2' },
    ]);
  });
});
