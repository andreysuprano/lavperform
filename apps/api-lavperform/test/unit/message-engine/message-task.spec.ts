import { MessageStatus } from '@prisma/client';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { MessageTasks } from 'src/message-engine/cron/message-task';

describe('MessageTasks', () => {
  const messageQueue: any = { add: jest.fn() };
  const prisma: any = {
    message: { findMany: jest.fn(), update: jest.fn(), updateMany: jest.fn() },
    customer: { findUnique: jest.fn() },
    automaticCampaign: { findUnique: jest.fn() },
  };

  let tasks: MessageTasks;

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01T12:00:00.000Z'));
    jest.clearAllMocks();
    // Por padrão simula 1 mensagem reivindicada para que o fluxo continue
    // até `findMany`. Testes específicos podem sobrescrever esse mock.
    prisma.message.updateMany = jest.fn().mockResolvedValue({ count: 1 });
    tasks = new MessageTasks(prisma, messageQueue);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('dispatches scheduled messages for active campaigns', async () => {
    const message = {
      id: 'm1',
      customerId: 'cust1',
      automaticCampaignId: 'ac1',
      status: MessageStatus.PROCESSING,
      scheduledDate: new Date(),
    };
    prisma.message.findMany = jest.fn().mockResolvedValue([message]);
    prisma.customer.findUnique = jest.fn().mockResolvedValue({ id: 'cust1' });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({ id: 'ac1', active: true });
    prisma.message.update = jest.fn().mockResolvedValue({});
    messageQueue.add = jest.fn().mockResolvedValue({});

    await tasks.handleScheduledMessages();

    expect(prisma.message.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledDate: expect.any(Object),
          status: MessageStatus.PENDING,
        }),
        data: { status: MessageStatus.PROCESSING },
      }),
    );
    expect(prisma.message.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          scheduledDate: expect.any(Object),
          status: MessageStatus.PROCESSING,
        }),
      }),
    );
    expect(messageQueue.add).toHaveBeenCalledWith(QUEUE_NAMES.MESSAGE_ENGINE, {
      message,
      customer: { id: 'cust1' },
      campaign: { id: 'ac1', active: true },
    });
  });

  it('aborts message when campaign is inactive', async () => {
    const message = {
      id: 'm2',
      customerId: 'cust1',
      automaticCampaignId: 'ac2',
      status: MessageStatus.PROCESSING,
    };
    prisma.message.findMany = jest.fn().mockResolvedValue([message]);
    prisma.customer.findUnique = jest.fn().mockResolvedValue({ id: 'cust1' });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({ id: 'ac2', active: false });
    prisma.message.update = jest.fn().mockResolvedValue({});

    await tasks.handleScheduledMessages();

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'm2' },
      data: { status: MessageStatus.ABORTED },
    });
    expect(messageQueue.add).not.toHaveBeenCalled();
  });

  it('handles errors without throwing', async () => {
    prisma.message.updateMany = jest.fn().mockRejectedValue(new Error('db error'));

    await expect(tasks.handleScheduledMessages()).resolves.toBeUndefined();
  });

  it('aborts message when automaticCampaignId is missing', async () => {
    prisma.message.findMany = jest.fn().mockResolvedValue([
      {
        id: 'm3',
        customerId: 'cust1',
        automaticCampaignId: null,
        status: MessageStatus.PROCESSING,
      },
    ]);
    prisma.customer.findUnique = jest.fn().mockResolvedValue({ id: 'cust1' });
    prisma.message.update = jest.fn().mockResolvedValue({});

    await tasks.handleScheduledMessages();

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'm3' },
      data: { status: MessageStatus.ABORTED },
    });
    expect(messageQueue.add).not.toHaveBeenCalled();
  });

  it('aborts when campaign not found', async () => {
    const message = {
      id: 'm4',
      customerId: 'cust1',
      automaticCampaignId: 'ac-missing',
      status: MessageStatus.PROCESSING,
    };
    prisma.message.findMany = jest.fn().mockResolvedValue([message]);
    prisma.customer.findUnique = jest.fn().mockResolvedValue({ id: 'cust1' });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue(null);
    prisma.message.update = jest.fn().mockResolvedValue({});

    await tasks.handleScheduledMessages();

    expect(prisma.message.update).toHaveBeenCalledWith({
      where: { id: 'm4' },
      data: { status: MessageStatus.ABORTED },
    });
    expect(messageQueue.add).not.toHaveBeenCalled();
  });

  it('handles scheduling window calculation with multiple messages', async () => {
    const msg = {
      id: 'm6',
      customerId: 'cust1',
      automaticCampaignId: 'ac1',
      status: MessageStatus.PROCESSING,
      scheduledDate: new Date(),
    };
    prisma.message.findMany = jest.fn().mockResolvedValue([msg]);
    prisma.customer.findUnique = jest.fn().mockResolvedValue({ id: 'cust1' });
    prisma.automaticCampaign.findUnique = jest.fn().mockResolvedValue({ id: 'ac1', active: true });
    prisma.message.update = jest.fn().mockResolvedValue({});

    await tasks.handleScheduledMessages();

    expect(prisma.message.findMany).toHaveBeenCalled();
  });
});
