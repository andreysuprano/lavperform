import { MessageStatus } from '@prisma/client';
import { CAMPAIGN_PAUSED_ABORT_ERROR } from 'src/automatic-campaign/automatic-campaign.constants';
import { MessageProcessor } from 'src/message-engine/processor/message-processor';

describe('MessageProcessor', () => {
  const prisma: any = {
    whatsappInstance: { findFirst: jest.fn() },
    message: { findUnique: jest.fn(), findFirst: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    campaignMetric: { updateMany: jest.fn() },
    customer: { updateMany: jest.fn() },
    automaticCampaign: { findUnique: jest.fn().mockResolvedValue(null) },
  };
  const whatsappService: any = {
    sendMessageWithImage: jest.fn(),
  };
  const eventEmitter: any = {
    emit: jest.fn(),
  };
  const renitencyEvaluator: any = {
    shouldApplyRenitency: jest.fn().mockReturnValue(false),
    canContactCustomer: jest.fn().mockResolvedValue({ allowed: true }),
  };

  let processor: MessageProcessor;

  beforeEach(() => {
    jest.clearAllMocks();
    renitencyEvaluator.shouldApplyRenitency.mockReturnValue(false);
    renitencyEvaluator.canContactCustomer.mockResolvedValue({ allowed: true });
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: 'ac1',
    });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      active: true,
    });
    processor = new MessageProcessor(prisma, whatsappService, eventEmitter, renitencyEvaluator);
  });

  const baseJob = {
    data: {
      message: {
        id: 'msg1',
        phone: '5511999999999',
        messageText: 'Hello',
        mediaUrl: 'img.jpg',
        companyId: 'comp1',
        customerId: 'cust1',
        channel: 'WHATSAPP_WEB',
        campaignId: 'camp1',
        automaticCampaignId: 'ac1',
        weatherAlertHistoryId: null,
      },
      customer: { id: 'cust1', companyId: 'comp1' },
      campaign: { id: 'camp1' },
      automaticCampaign: { id: 'ac1' },
    },
  } as any;

  it('sends message and updates metrics/customer on success', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: 'ac1',
    });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      active: true,
    });
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance', token: 'instance-token' });
    whatsappService.sendMessageWithImage = jest.fn().mockResolvedValue(undefined);
    prisma.message.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});
    prisma.customer.updateMany = jest.fn().mockResolvedValue({});

    await processor.process(baseJob);

    expect(whatsappService.sendMessageWithImage).toHaveBeenCalledWith(
      '5511999999999',
      'Hello',
      'img.jpg',
      'instance-token',
    );
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { id: 'msg1', status: MessageStatus.PROCESSING },
      data: expect.objectContaining({ status: MessageStatus.SENT, attempts: 1 }),
    });
    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { messagesSent: { increment: 1 } },
    });
    expect(prisma.customer.updateMany).toHaveBeenCalledWith({
      where: { id: 'cust1' },
      data: { lastContactDate: expect.any(Date) },
    });
  });

  it('updates campaign metrics when no automatic campaign', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: null,
    });
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance' });
    whatsappService.sendMessageWithImage = jest.fn().mockResolvedValue(undefined);
    prisma.message.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});
    prisma.customer.updateMany = jest.fn().mockResolvedValue({});

    await processor.process({
      data: {
        ...baseJob.data,
        message: { ...baseJob.data.message, automaticCampaignId: undefined },
      },
    } as any);

    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp1' },
      data: { messagesSent: { increment: 1 } },
    });
  });

  it('marks message as error and increments error metrics on failure', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: null,
    });
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue(null); // triggers error
    prisma.message.update = jest.fn().mockResolvedValue({});
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});

    await processor.process({
      data: {
        ...baseJob.data,
        message: { ...baseJob.data.message, automaticCampaignId: undefined },
      },
    } as any);

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'msg1' },
      data: expect.objectContaining({ status: MessageStatus.ERROR, error: expect.any(String) }),
    });
    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { campaignId: 'camp1' },
      data: { messagesError: { increment: 1 } },
    });
  });

  it('increments automatic campaign error metrics when media is missing', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance' });
    prisma.message.update = jest.fn().mockResolvedValue({});
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});

    await processor.process({
      data: {
        ...baseJob.data,
        message: { ...baseJob.data.message, mediaUrl: undefined },
      },
    } as any);

    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { messagesError: { increment: 1 } },
    });
  });

  it('handles sendMessage failure with automatic campaign metrics', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance' });
    whatsappService.sendMessageWithImage = jest.fn().mockRejectedValue(new Error('send-fail'));
    prisma.message.update = jest.fn().mockResolvedValue({});
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});

    await processor.process(baseJob as any);

    expect(prisma.campaignMetric.updateMany).toHaveBeenCalledWith({
      where: { automaticCampaignId: 'ac1' },
      data: { messagesError: { increment: 1 } },
    });
  });

  it('aborts message when renitency blocks an automatic campaign message', async () => {
    renitencyEvaluator.shouldApplyRenitency.mockReturnValue(true);
    renitencyEvaluator.canContactCustomer.mockResolvedValue({
      allowed: false,
      reason: 'RENITENCY_BLOCKED: teste',
    });
    prisma.message.update = jest.fn().mockResolvedValue({});

    await processor.process(baseJob);

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'msg1' },
      data: expect.objectContaining({ status: MessageStatus.ABORTED, error: 'RENITENCY_BLOCKED: teste' }),
    });
    expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled();
  });

  it('skips renitency check for manual campaign messages', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: null,
    });
    renitencyEvaluator.shouldApplyRenitency.mockReturnValue(false);
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance', token: 'tok' });
    whatsappService.sendMessageWithImage = jest.fn().mockResolvedValue(undefined);
    prisma.message.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});
    prisma.customer.updateMany = jest.fn().mockResolvedValue({});

    const manualJob = {
      data: {
        ...baseJob.data,
        message: { ...baseJob.data.message, automaticCampaignId: null },
      },
    } as any;

    await processor.process(manualJob);

    expect(renitencyEvaluator.canContactCustomer).not.toHaveBeenCalled();
    expect(whatsappService.sendMessageWithImage).toHaveBeenCalled();
  });

  it('does not send when message is no longer PROCESSING', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.ABORTED,
      automaticCampaignId: 'ac1',
    });
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance', token: 'instance-token' });
    whatsappService.sendMessageWithImage = jest.fn().mockResolvedValue(undefined);
    prisma.message.update = jest.fn().mockResolvedValue({});

    await processor.process(baseJob);

    expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled();
    expect(prisma.message.update).not.toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: MessageStatus.SENT }),
      }),
    );
  });

  it('aborts without sending when campaign is inactive', async () => {
    prisma.message.findUnique = jest.fn().mockResolvedValue({
      id: 'msg1',
      status: MessageStatus.PROCESSING,
      automaticCampaignId: 'ac1',
    });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({
      id: 'ac1',
      active: false,
    });
    prisma.message.update = jest.fn().mockResolvedValue({});

    await processor.process(baseJob);

    expect(whatsappService.sendMessageWithImage).not.toHaveBeenCalled();
    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'msg1' },
      data: {
        status: MessageStatus.ABORTED,
        error: CAMPAIGN_PAUSED_ABORT_ERROR,
      },
    });
  });

  it('does not mark SENT or increment metrics when message was aborted after send', async () => {
    prisma.whatsappInstance.findFirst = jest.fn().mockResolvedValue({ name: 'instance', token: 'instance-token' });
    whatsappService.sendMessageWithImage = jest.fn().mockResolvedValue(undefined);
    prisma.message.updateMany = jest.fn().mockResolvedValue({ count: 0 });
    prisma.campaignMetric.updateMany = jest.fn().mockResolvedValue({});
    prisma.customer.updateMany = jest.fn().mockResolvedValue({});

    await processor.process(baseJob);

    expect(whatsappService.sendMessageWithImage).toHaveBeenCalled();
    expect(prisma.message.updateMany).toHaveBeenCalledWith({
      where: { id: 'msg1', status: MessageStatus.PROCESSING },
      data: expect.objectContaining({ status: MessageStatus.SENT }),
    });
    expect(prisma.campaignMetric.updateMany).not.toHaveBeenCalled();
    expect(prisma.customer.updateMany).not.toHaveBeenCalled();
  });
});
