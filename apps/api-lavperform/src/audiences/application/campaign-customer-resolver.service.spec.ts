import { NotFoundException } from '@nestjs/common';
import { AudienceTargetingMode, CampaignChannel } from '@prisma/client';
import { getWhatsappVerificationCutoff } from '../../whatsapp/application/whatsapp-verification.policy';
import { CampaignCustomerResolverService } from './campaign-customer-resolver.service';

describe('CampaignCustomerResolverService', () => {
  const fixedNow = new Date('2026-09-03T12:00:00.000Z');
  const prisma = {
    audience: { findFirst: jest.fn() },
    customSendList: { findFirst: jest.fn() },
    customSendListMember: { findMany: jest.fn() },
    customer: { findMany: jest.fn(), count: jest.fn() },
  } as any;

  const audienceQueryEngine = {
    resolveCustomerIds: jest.fn(),
  } as any;

  let resolver: CampaignCustomerResolverService;
  const originalTtl = process.env.WHATSAPP_VERIFICATION_TTL_DAYS;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();
    process.env.WHATSAPP_VERIFICATION_TTL_DAYS = '30';
    resolver = new CampaignCustomerResolverService(prisma, audienceQueryEngine);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  afterAll(() => {
    if (originalTtl === undefined) {
      delete process.env.WHATSAPP_VERIFICATION_TTL_DAYS;
    } else {
      process.env.WHATSAPP_VERIFICATION_TTL_DAYS = originalTtl;
    }
  });

  it('resolves RFV customers with whatsapp filters', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    const result = await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao,fiel',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(result).toEqual([{ id: 'c1' }]);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
          whatsappOptin: true,
          whatsappVerified: true,
          whatsappVerifiedAt: {
            gte: getWhatsappVerificationCutoff(fixedNow),
          },
          rfvClassification: { in: ['campeao', 'fiel'] },
        }),
      }),
    );
  });

  it('resolves AUDIENCE customers via query engine', async () => {
    prisma.audience.findFirst.mockResolvedValue({
      id: 'aud-1',
      definition: { version: 1, include: { operator: 'AND', rules: [] } },
    });
    audienceQueryEngine.resolveCustomerIds.mockResolvedValue(['c1', 'c2']);
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }, { id: 'c2' }]);

    const result = await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.AUDIENCE,
      audienceId: 'aud-1',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(result).toHaveLength(2);
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['c1', 'c2'] },
        }),
      }),
    );
  });

  it('resolves CUSTOMER_LIST members with live membership', async () => {
    prisma.customSendList.findFirst.mockResolvedValue({ id: 'list-1' });
    prisma.customSendListMember.findMany.mockResolvedValue([
      { customerId: 'c1' },
      { customerId: 'c2' },
    ]);
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    const result = await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
      customSendListId: 'list-1',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(result).toEqual([{ id: 'c1' }]);
    expect(prisma.customSendListMember.findMany).toHaveBeenCalledWith({
      where: { listId: 'list-1' },
      select: { customerId: true },
    });
  });

  it('returns empty set when CUSTOMER_LIST has no members', async () => {
    prisma.customSendList.findFirst.mockResolvedValue({ id: 'list-1' });
    prisma.customSendListMember.findMany.mockResolvedValue([]);
    prisma.customer.findMany.mockResolvedValue([]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
      customSendListId: 'list-1',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { in: ['__none__'] },
        }),
      }),
    );
  });

  it('filters SMS customers by real phone for any eligibility', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'novo',
      channel: CampaignChannel.SMS,
    });

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        companyId: 'company-1',
        phone: { not: null },
        NOT: { phone: { startsWith: 'cpf:' } },
      }),
    );
    expect(where.whatsappOptin).toBeUndefined();
    expect(where.whatsappVerified).toBeUndefined();
    expect(where.whatsappVerifiedAt).toBeUndefined();

    prisma.customer.findMany.mockClear();
    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'novo',
      channel: CampaignChannel.SMS,
      eligibility: 'contactable',
    });

    expect(prisma.customer.findMany.mock.calls[0][0].where).toEqual(
      expect.objectContaining({
        phone: { not: null },
        NOT: { phone: { startsWith: 'cpf:' } },
      }),
    );
  });

  it('applies fresh WhatsApp filters by default for WhatsApp Business API', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.WHATSAPP_BUSINESS_API,
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          whatsappOptin: true,
          whatsappVerified: true,
          whatsappVerifiedAt: {
            gte: getWhatsappVerificationCutoff(fixedNow),
          },
        }),
      }),
    );
  });

  it('applies contactable WhatsApp filters without freshness', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.WHATSAPP_WEB,
      eligibility: 'contactable',
    });

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        whatsappOptin: true,
        whatsappVerified: true,
        phone: { not: null },
        NOT: { phone: { startsWith: 'cpf:' } },
      }),
    );
    expect(where.whatsappVerifiedAt).toBeUndefined();
  });

  it('filters EMAIL customers by non-null email', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.EMAIL,
    });

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where).toEqual(
      expect.objectContaining({
        companyId: 'company-1',
        email: { not: null },
      }),
    );
    expect(where.whatsappOptin).toBeUndefined();
    expect(where.phone).toBeUndefined();
  });

  it('does not apply channel filters when channel is omitted', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'campeao',
    });

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where).toEqual({
      companyId: 'company-1',
      rfvClassification: { in: ['campeao'] },
    });
  });

  it('does not apply WhatsApp filters for other channels without specific rules', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.RCS,
    });

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where.whatsappOptin).toBeUndefined();
    expect(where.whatsappVerified).toBeUndefined();
    expect(where.whatsappVerifiedAt).toBeUndefined();
    expect(where.phone).toBeUndefined();
    expect(where.email).toBeUndefined();
  });

  it('preserves campaign order and take when resolving', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.WHATSAPP_WEB,
      take: 10,
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        take: 10,
        orderBy: [
          { lastContactDate: { sort: 'asc', nulls: 'first' } },
          { createdAt: 'asc' },
        ],
      }),
    );
  });

  it('excludes customers by id when excludeCustomerIds is provided', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.WHATSAPP_WEB,
      excludeCustomerIds: ['blocked-1', 'blocked-2'],
    });

    expect(prisma.customer.findMany.mock.calls[0][0].where.id).toEqual({
      notIn: ['blocked-1', 'blocked-2'],
    });
  });

  it('combines audience ids with excludeCustomerIds in a single id filter', async () => {
    prisma.audience.findFirst.mockResolvedValue({
      id: 'aud-1',
      definition: { version: 1, include: { operator: 'AND', rules: [] } },
    });
    audienceQueryEngine.resolveCustomerIds.mockResolvedValue(['c1', 'c2', 'c3']);
    prisma.customer.findMany.mockResolvedValue([{ id: 'c2' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.AUDIENCE,
      audienceId: 'aud-1',
      channel: CampaignChannel.WHATSAPP_WEB,
      excludeCustomerIds: ['c1'],
    });

    expect(prisma.customer.findMany.mock.calls[0][0].where.id).toEqual({
      in: ['c1', 'c2', 'c3'],
      notIn: ['c1'],
    });
  });

  it('ignores an empty excludeCustomerIds list', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      channel: CampaignChannel.WHATSAPP_WEB,
      excludeCustomerIds: [],
    });

    expect(prisma.customer.findMany.mock.calls[0][0].where.id).toBeUndefined();
  });

  it('counts eligible customers via prisma.customer.count with shared where', async () => {
    prisma.audience.findFirst.mockResolvedValue({
      id: 'aud-1',
      definition: { version: 1, include: { operator: 'AND', rules: [] } },
    });
    audienceQueryEngine.resolveCustomerIds.mockResolvedValue(['c1', 'c2']);
    prisma.customer.count.mockResolvedValue(2);

    const result = await resolver.countEligibleCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.AUDIENCE,
      audienceId: 'aud-1',
      channel: CampaignChannel.WHATSAPP_WEB,
    });

    expect(result).toBe(2);
    expect(prisma.customer.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        companyId: 'company-1',
        id: { in: ['c1', 'c2'] },
        whatsappOptin: true,
        whatsappVerified: true,
        whatsappVerifiedAt: {
          gte: getWhatsappVerificationCutoff(fixedNow),
        },
      }),
    });
    expect(prisma.customer.findMany).not.toHaveBeenCalled();
  });

  it('throws when CUSTOMER_LIST is not found', async () => {
    prisma.customSendList.findFirst.mockResolvedValue(null);

    await expect(
      resolver.resolveCustomers({
        companyId: 'company-1',
        targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
        customSendListId: 'missing',
        channel: CampaignChannel.WHATSAPP_WEB,
      }),
    ).rejects.toThrow(NotFoundException);
  });

  it('resolves segmentation labels', () => {
    expect(
      resolver.resolveSegmentationLabel({
        targetingMode: AudienceTargetingMode.AUDIENCE,
        audienceName: 'VIP',
      }),
    ).toBe('audience:VIP');

    expect(
      resolver.resolveSegmentationLabel({
        targetingMode: AudienceTargetingMode.CUSTOMER_LIST,
        customSendListName: 'Lista A',
      }),
    ).toBe('lista:Lista A');

    expect(
      resolver.resolveSegmentationLabel({
        targetingMode: AudienceTargetingMode.RFV,
        segmentation: 'campeao',
      }),
    ).toBe('campeao');
  });
});
