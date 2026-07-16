import { CampaignStatus, MessageStatus } from '@prisma/client';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

const generateMessageMock = jest.fn();

jest.mock('src/integrations/openai/api/openai.service', () => ({
  OpenAIService: jest.fn().mockImplementation(() => ({
    generateMessage: generateMessageMock,
  })),
}));

jest.mock('@nestjs/axios', () => ({
  HttpService: jest.fn().mockImplementation(() => ({})),
}));

import { CampaignsProcessor } from 'src/campaigns/infrastructure/jobs/campaigns.processor';
import { CAMPAIGN_CUSTOMER_ORDER_BY } from 'src/common/utils/campaign-customer-order.utils';

describe('CampaignsProcessor', () => {
  const prisma: any = {
    campaign: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    customer: {
      findMany: jest.fn(),
    },
    campaignMetric: {
      updateMany: jest.fn(),
    },
    message: {
      create: jest.fn(),
    },
  };

  const messageQueue: any = {
    add: jest.fn(),
  };

  let processor: CampaignsProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    processor = new CampaignsProcessor(prisma, messageQueue, {} as any);
  });

  it('marks campaign completed and enqueues messages', async () => {
    prisma.campaign.findUnique = jest.fn().mockResolvedValue({
      id: 'camp1',
      companyId: 'comp1',
      segmentation: 'segA,segB',
      messageText: 'Hello',
      imageUrl: 'img.jpg',
      maxDailySends: 50,
    });
    prisma.customer.findMany = jest.fn().mockResolvedValue([
      { id: 'cust1', name: 'A', phone: '1' },
      { id: 'cust2', name: 'B', phone: '2' },
    ]);
    generateMessageMock.mockResolvedValue({ message: 'generated' });
    prisma.message.create = jest.fn().mockResolvedValue({ id: 'msg1' });
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.campaign.update = jest.fn().mockResolvedValue({ id: 'camp1', status: CampaignStatus.COMPLETED });

    await processor.process({ data: { campaignId: 'camp1' } } as any);
    await new Promise(setImmediate);

    expect(messageQueue.add).toHaveBeenCalledTimes(2);
    expect(messageQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.MESSAGE_ENGINE,
      expect.objectContaining({
        campaign: expect.objectContaining({ id: 'camp1' }),
        customer: expect.objectContaining({ id: 'cust1' }),
        message: expect.any(Object),
      }),
    );
    expect(prisma.campaign.update).toHaveBeenCalledWith({
      where: { id: 'camp1' },
      data: { status: CampaignStatus.COMPLETED },
    });
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: CAMPAIGN_CUSTOMER_ORDER_BY,
        where: expect.objectContaining({ whatsappVerified: true }),
      }),
    );
    expect(prisma.customer.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({ take: expect.anything() }),
    );
    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp1' },
      data: { totalCustomers: 2 },
    });
    expect(generateMessageMock).toHaveBeenCalledWith(
      expect.objectContaining({
        customerName: 'A',
        messageText: 'Hello',
        linkCardapio: expect.stringContaining('/c/'),
      }),
    );
  });

  it('logs error and skips when campaign is missing', async () => {
    prisma.campaign.findUnique = jest.fn().mockResolvedValue(null);

    await processor.process({ data: { campaignId: 'missing' } } as any);
    await new Promise(setImmediate);

    expect(prisma.campaign.update).not.toHaveBeenCalled();
    expect(messageQueue.add).not.toHaveBeenCalled();
    expect(prisma.message.create).not.toHaveBeenCalled();
  });
});
