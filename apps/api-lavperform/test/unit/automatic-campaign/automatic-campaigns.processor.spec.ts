import { AutomaticCampaignStatus, CampaignChannel, MessageStatus } from '@prisma/client';

const FIXED_NOW = new Date('2024-01-01T12:00:00.000Z');
const FRESH_VERIFIED_AT = new Date('2023-12-28T12:00:00.000Z');
const STALE_VERIFIED_AT = new Date('2023-01-01T12:00:00.000Z');

const getDayOfWeekPtBrMock = jest.fn().mockReturnValue('seg');
const nowUTCMock = jest.fn().mockReturnValue(FIXED_NOW);
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

const freshCustomer = (id: string) => ({
  id,
  name: id.toUpperCase(),
  phone: `55119${id}`,
  whatsappVerifiedAt: FRESH_VERIFIED_AT,
});

const staleCustomer = (id: string, verifiedAt: Date | null = STALE_VERIFIED_AT) => ({
  id,
  name: id.toUpperCase(),
  phone: `55119${id}`,
  whatsappVerifiedAt: verifiedAt,
});

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
      findMany: jest.fn().mockResolvedValue([]),
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
    enqueueStaleWhatsappValidationForCompany: jest.fn(),
  };
  const whatsappService: any = {
    validateAndPersistCustomerWhatsapp: jest.fn(),
  };

  let processor: AutomaticCampaignsProcessor;
  const originalTtl = process.env.WHATSAPP_VERIFICATION_TTL_DAYS;

  const whatsappCampaign = (overrides: Record<string, unknown> = {}) => ({
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
    ...overrides,
  });

  const lastCampaignUpdate = () => {
    const calls = prisma.automaticCampaign.update.mock.calls;
    return calls[calls.length - 1][0];
  };

  beforeEach(() => {
    jest.clearAllMocks();
    process.env.WHATSAPP_VERIFICATION_TTL_DAYS = '30';
    strategy.generateMessages.mockReset();
    strategy.generateMessages.mockResolvedValue(undefined);
    factory.get.mockReturnValue(strategy);
    prisma.message.count = jest.fn().mockResolvedValue(0);
    prisma.message.findMany = jest.fn().mockResolvedValue([]);
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.automaticCampaign.update = jest.fn().mockResolvedValue({});
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({
      isOpen: true,
      openTime: '10:00',
      closeTime: '18:00',
    });
    renitencyEvaluator.canContactCustomer.mockResolvedValue({ allowed: true });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(0);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([]);
    customersService.enqueueStaleWhatsappValidationForCompany.mockResolvedValue({
      totalEnqueued: 0,
    });
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(true);
    processor = new AutomaticCampaignsProcessor(
      prisma,
      factory,
      renitencyEvaluator,
      campaignCustomerResolver,
      customersService,
      whatsappService,
    );
  });

  afterAll(() => {
    if (originalTtl === undefined) {
      delete process.env.WHATSAPP_VERIFICATION_TTL_DAYS;
    } else {
      process.env.WHATSAPP_VERIFICATION_TTL_DAYS = originalTtl;
    }
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

    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({
        segmentation: 'segA,segB',
        images: 'img1,img2',
        status: AutomaticCampaignStatus.PROCESSING,
      }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      freshCustomer('cust1'),
      freshCustomer('cust2'),
    ]);

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
    expect(whatsappService.validateAndPersistCustomerWhatsapp).not.toHaveBeenCalled();
    expect(prisma.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: expect.objectContaining({
        lastProcessedAt: FIXED_NOW,
        status: AutomaticCampaignStatus.IN_PROGRESS,
      }),
    });
  });

  it('counts and resolves contactable customers and warms up stale validation', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(whatsappCampaign());
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(7);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([freshCustomer('c1')]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(
      customersService.enqueueStaleWhatsappValidationForCompany,
    ).toHaveBeenCalledWith('comp1');
    expect(campaignCustomerResolver.countEligibleCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp1',
        channel: CampaignChannel.WHATSAPP_WEB,
        eligibility: 'contactable',
      }),
    );
    expect(campaignCustomerResolver.resolveCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        companyId: 'comp1',
        targetingMode: 'RFV',
        eligibility: 'contactable',
        take: 250,
      }),
    );
  });

  it('warms up stale validation only after the synchronous validation and message generation', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 1 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([staleCustomer('s1')]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    const warmupOrder =
      customersService.enqueueStaleWhatsappValidationForCompany.mock.invocationCallOrder[0];
    const validationOrder =
      whatsappService.validateAndPersistCustomerWhatsapp.mock.invocationCallOrder[0];
    const generationOrder = strategy.generateMessages.mock.invocationCallOrder[0];
    const updateOrder = prisma.automaticCampaign.update.mock.invocationCallOrder[0];

    expect(warmupOrder).toBeGreaterThan(validationOrder);
    expect(warmupOrder).toBeGreaterThan(generationOrder);
    expect(warmupOrder).toBeLessThan(updateOrder);
  });

  it('isolates warmup failures without failing the campaign', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 1 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([freshCustomer('f1')]);
    customersService.enqueueStaleWhatsappValidationForCompany.mockRejectedValue(
      new Error('redis down'),
    );

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
    const update = lastCampaignUpdate();
    expect(update.data.status).not.toBe(AutomaticCampaignStatus.FAILED);
    expect(update.data).toEqual(
      expect.objectContaining({
        lastProcessedAt: FIXED_NOW,
        lastProcessingError: null,
      }),
    );
  });

  it('excludes customers already messaged today from the candidate resolution', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 5 }),
    );
    prisma.message.count = jest.fn().mockResolvedValue(2);
    prisma.message.findMany = jest
      .fn()
      .mockResolvedValue([{ customerId: 'sent1' }, { customerId: 'sent2' }]);
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(9);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([freshCustomer('f1')]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          automaticCampaignId: 'ac1',
          status: {
            in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT],
          },
        }),
        select: { customerId: true },
        distinct: ['customerId'],
      }),
    );
    expect(campaignCustomerResolver.resolveCustomers).toHaveBeenCalledWith(
      expect.objectContaining({
        excludeCustomerIds: ['sent1', 'sent2'],
        take: 15,
      }),
    );
    expect(campaignCustomerResolver.countEligibleCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ eligibility: 'contactable' }),
    );
    expect(
      campaignCustomerResolver.countEligibleCustomers.mock.calls[0][0].excludeCustomerIds,
    ).toBeUndefined();
  });

  it('does not conclude when the candidate sample was truncated by take', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 5 }),
    );
    const candidates = Array.from({ length: 25 }, (_, index) =>
      staleCustomer(`s${index + 1}`),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(120);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue(candidates);
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(false);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(campaignCustomerResolver.resolveCustomers).toHaveBeenCalledWith(
      expect.objectContaining({ take: 25 }),
    );
    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(25);
    expect(lastCampaignUpdate().data.lastProcessedAt).toBeUndefined();
  });

  it('validates stale candidates one at a time', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 4 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(4);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1'),
      staleCustomer('s2'),
      staleCustomer('s3'),
      staleCustomer('s4'),
    ]);

    let inFlight = 0;
    let maxInFlight = 0;
    whatsappService.validateAndPersistCustomerWhatsapp.mockImplementation(async () => {
      inFlight++;
      maxInFlight = Math.max(maxInFlight, inFlight);
      await new Promise((resolve) => setImmediate(resolve));
      inFlight--;
      return true;
    });

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(4);
    expect(maxInFlight).toBe(1);
  });

  it('validates stale candidates sequentially when there is no fresh customer', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 5 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(5);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1'),
      staleCustomer('s2', null),
      staleCustomer('s3'),
      staleCustomer('s4', null),
      staleCustomer('s5'),
    ]);
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(true);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(5);
    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenNthCalledWith(
      1,
      's1',
      '55119s1',
    );
    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.customers.map((c: { id: string }) => c.id)).toEqual([
      's1',
      's2',
      's3',
      's4',
      's5',
    ]);
    expect(lastCampaignUpdate().data).toEqual(
      expect.objectContaining({ lastProcessedAt: FIXED_NOW }),
    );
  });

  it('skips stale candidates that are no longer on whatsapp and tries the next one', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 2 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(4);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1'),
      staleCustomer('s2'),
      staleCustomer('s3'),
      staleCustomer('s4'),
    ]);
    whatsappService.validateAndPersistCustomerWhatsapp
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false)
      .mockResolvedValueOnce(true);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(4);
    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.customers.map((c: { id: string }) => c.id)).toEqual(['s2', 's4']);
  });

  it('prefers fresh customers and only validates stale ones for the remaining slots', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 2 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(3);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1'),
      freshCustomer('f1'),
      staleCustomer('s2'),
    ]);
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(true);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.customers.map((c: { id: string }) => c.id)).toEqual(['f1', 's1']);
    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(1);
    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledWith(
      's1',
      '55119s1',
    );
  });

  it('does not mark lastProcessedAt when the validation cap is reached and stale candidates remain', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 50, status: AutomaticCampaignStatus.PROCESSING }),
    );
    const candidates = Array.from({ length: 35 }, (_, index) =>
      staleCustomer(`s${index + 1}`),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(35);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue(candidates);
    whatsappService.validateAndPersistCustomerWhatsapp.mockResolvedValue(false);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(30);
    const update = lastCampaignUpdate();
    expect(update.data.lastProcessedAt).toBeUndefined();
    expect(update.data).toEqual(
      expect.objectContaining({
        lastProcessingError: null,
        lastProcessingErrorAt: null,
        status: AutomaticCampaignStatus.IN_PROGRESS,
      }),
    );
    expect(strategy.generateMessages).toHaveBeenCalledTimes(1);
  });

  it('keeps the campaign healthy and retriable when a validation fails transiently', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 2 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1'),
      staleCustomer('s2'),
    ]);
    whatsappService.validateAndPersistCustomerWhatsapp
      .mockRejectedValueOnce(new Error('uazapi timeout'))
      .mockResolvedValueOnce(true);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.customers.map((c: { id: string }) => c.id)).toEqual(['s2']);
    const update = lastCampaignUpdate();
    expect(update.data.lastProcessedAt).toBeUndefined();
    expect(update.data.status).not.toBe(AutomaticCampaignStatus.FAILED);
    expect(update.data).toEqual(
      expect.objectContaining({ lastProcessingError: null }),
    );
  });

  it('marks the run as conclusive when there is no contactable candidate', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(whatsappCampaign());
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(0);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).not.toHaveBeenCalled();
    expect(lastCampaignUpdate().data).toEqual(
      expect.objectContaining({ lastProcessedAt: FIXED_NOW }),
    );
  });

  it('does not touch whatsapp validation for SMS campaigns', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ channel: CampaignChannel.SMS, maxDailySends: 2 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('s1', null),
      staleCustomer('s2'),
    ]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).not.toHaveBeenCalled();
    expect(
      customersService.enqueueStaleWhatsappValidationForCompany,
    ).not.toHaveBeenCalled();
    const ctx = strategy.generateMessages.mock.calls[0][0];
    expect(ctx.customers.map((c: { id: string }) => c.id)).toEqual(['s1', 's2']);
    expect(lastCampaignUpdate().data).toEqual(
      expect.objectContaining({ lastProcessedAt: FIXED_NOW }),
    );
  });

  it('respects renitency before validating stale candidates', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 1 }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(2);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([
      staleCustomer('blocked'),
      staleCustomer('allowed'),
    ]);
    renitencyEvaluator.canContactCustomer.mockImplementation(
      async ({ customerId }: { customerId: string }) => ({
        allowed: customerId !== 'blocked',
      }),
    );

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledTimes(1);
    expect(whatsappService.validateAndPersistCustomerWhatsapp).toHaveBeenCalledWith(
      'allowed',
      '55119allowed',
    );
  });

  it('does not change status when already IN_PROGRESS', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');

    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ images: 'img1' }),
    );
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(0);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([]);

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    const statusUpdates = prisma.automaticCampaign.update.mock.calls.filter(
      ([args]: [{ data?: { status?: string } }]) => args.data?.status !== undefined,
    );
    expect(statusUpdates).toHaveLength(0);
  });

  it('skips when daily limit is already reached', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ maxDailySends: 10 }),
    );
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
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ images: 'img1', maxDailySends: undefined }),
    );
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({ isOpen: false });

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(campaignCustomerResolver.resolveCustomers).not.toHaveBeenCalled();
    expect(strategy.generateMessages).not.toHaveBeenCalled();
  });

  it('runs with custom schedule even when establishment is closed', async () => {
    (getDayOfWeekPtBr as jest.Mock).mockReturnValue('seg');
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(
      whatsappCampaign({ sendTimeStart: '14:00', sendTimeEnd: null }),
    );
    prisma.openingHours.findFirst = jest.fn().mockResolvedValue({ isOpen: false });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([freshCustomer('c1')]);

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
      .mockResolvedValueOnce(
        whatsappCampaign({ status: AutomaticCampaignStatus.PROCESSING }),
      )
      .mockResolvedValueOnce({ status: AutomaticCampaignStatus.PROCESSING });
    campaignCustomerResolver.countEligibleCustomers.mockResolvedValue(1);
    campaignCustomerResolver.resolveCustomers.mockResolvedValue([freshCustomer('c1')]);
    strategy.generateMessages.mockRejectedValue(new Error('boom'));

    await processor.process({ data: { automaticCampaignId: 'ac1' } } as any);

    expect(prisma.automaticCampaign.update).toHaveBeenCalledWith({
      where: { id: 'ac1' },
      data: expect.objectContaining({
        status: AutomaticCampaignStatus.FAILED,
      }),
    });
  });
});
