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
    customer: { findMany: jest.fn() },
  } as any;

  const audienceQueryEngine = {
    resolveCustomerIds: jest.fn(),
  } as any;

  let resolver: CampaignCustomerResolverService;

  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(fixedNow);
    jest.clearAllMocks();
    resolver = new CampaignCustomerResolverService(prisma, audienceQueryEngine);
  });

  afterEach(() => {
    jest.useRealTimers();
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

  it('does not apply whatsapp filters for SMS channel', async () => {
    prisma.customer.findMany.mockResolvedValue([{ id: 'c1' }]);

    await resolver.resolveCustomers({
      companyId: 'company-1',
      targetingMode: AudienceTargetingMode.RFV,
      segmentation: 'novo',
      channel: CampaignChannel.SMS,
    });

    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          companyId: 'company-1',
        }),
      }),
    );

    const where = prisma.customer.findMany.mock.calls[0][0].where;
    expect(where.whatsappOptin).toBeUndefined();
    expect(where.whatsappVerified).toBeUndefined();
    expect(where.whatsappVerifiedAt).toBeUndefined();
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
