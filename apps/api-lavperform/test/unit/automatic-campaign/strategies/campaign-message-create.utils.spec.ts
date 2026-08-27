import { MessageStatus, Prisma } from '@prisma/client';
import { createAutomaticCampaignMessageIfAbsentToday } from 'src/automatic-campaign/infrastructure/strategies/campaign-message-create.utils';

describe('createAutomaticCampaignMessageIfAbsentToday', () => {
  const startOfToday = new Date('2026-08-27T03:00:00.000Z');
  const endOfToday = new Date('2026-08-28T02:59:59.999Z');
  const data = {
    customerId: 'cust1',
    automaticCampaignId: 'ac1',
    status: MessageStatus.PENDING,
  } as Prisma.MessageUncheckedCreateInput;

  function prismaWith(tx: { findFirst: jest.Mock; create: jest.Mock }) {
    return {
      $transaction: jest.fn(async (fn: any) => fn({ message: tx })),
    } as any;
  }

  it('creates when only ABORTED exists today (status filter ignores ABORTED)', async () => {
    const findFirst = jest.fn().mockResolvedValue(null);
    const create = jest.fn().mockResolvedValue({ id: 'msg-new' });
    const prisma = prismaWith({ findFirst, create });

    const result = await createAutomaticCampaignMessageIfAbsentToday(prisma, {
      campaignId: 'ac1',
      customerId: 'cust1',
      startOfToday,
      endOfToday,
      data,
    });

    expect(findFirst).toHaveBeenCalledWith({
      where: {
        customerId: 'cust1',
        automaticCampaignId: 'ac1',
        createdAt: { gte: startOfToday, lte: endOfToday },
        status: {
          in: [MessageStatus.PENDING, MessageStatus.PROCESSING, MessageStatus.SENT],
        },
      },
      select: { id: true },
    });
    expect(create).toHaveBeenCalledWith({ data });
    expect(result).toBe('created');
  });

  it('skips create when PENDING/PROCESSING/SENT already exists today', async () => {
    const findFirst = jest.fn().mockResolvedValue({ id: 'msg-existing' });
    const create = jest.fn();
    const prisma = prismaWith({ findFirst, create });

    const result = await createAutomaticCampaignMessageIfAbsentToday(prisma, {
      campaignId: 'ac1',
      customerId: 'cust1',
      startOfToday,
      endOfToday,
      data,
    });

    expect(create).not.toHaveBeenCalled();
    expect(result).toBe('skipped');
  });
});
