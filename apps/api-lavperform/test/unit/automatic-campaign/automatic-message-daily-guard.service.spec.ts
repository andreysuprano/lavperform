import { MessageStatus } from '@prisma/client';
import {
  AutomaticMessageDailyGuardService,
  DAILY_AUTOMATIC_DUPLICATE_ERROR,
} from 'src/automatic-campaign/application/automatic-message-daily-guard.service';

describe('AutomaticMessageDailyGuardService', () => {
  const now = new Date('2026-09-04T15:00:00.000Z');

  const candidate = (overrides: Record<string, unknown> = {}) => ({
    id: 'blocker',
    companyId: 'c1',
    customerId: 'u1',
    phone: '+5511999999999',
    status: MessageStatus.PENDING,
    automaticCampaignId: 'automatic-1',
    createdAt: new Date('2026-09-04T12:00:00.000Z'),
    ...overrides,
  });

  function setup() {
    const tx = {
      message: {
        findUnique: jest.fn(),
        findMany: jest.fn().mockResolvedValue([]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ pg_advisory_xact_lock: null }]),
    };
    const prisma = {
      message: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn(async (callback: (client: typeof tx) => unknown) =>
        callback(tx),
      ),
    };

    return {
      guard: new AutomaticMessageDailyGuardService(prisma as any),
      prisma,
      tx,
    };
  }

  describe('canGenerate', () => {
    it.each([
      MessageStatus.PENDING,
      MessageStatus.PROCESSING,
      MessageStatus.SENT,
    ])(
      'blocks the same customer when the prior status is %s',
      async (status) => {
        const { guard, prisma } = setup();
        prisma.message.findMany.mockResolvedValue([
          candidate({ status, phone: '+5511888888888' }),
        ]);

        await expect(
          guard.canGenerate({
            companyId: 'c1',
            customerId: 'u1',
            phone: '(11) 99999-9999',
            now,
          }),
        ).resolves.toBe(false);
      },
    );

    it('blocks the same canonical phone across different customers and legacy formats', async () => {
      const { guard, prisma } = setup();
      prisma.message.findMany.mockResolvedValue([
        candidate({ customerId: 'other', phone: '11 99999-9999' }),
      ]);

      await expect(
        guard.canGenerate({
          companyId: 'c1',
          customerId: 'u1',
          phone: '+55 (11) 99999-9999',
          now,
        }),
      ).resolves.toBe(false);
    });

    it.each([MessageStatus.ERROR, MessageStatus.ABORTED])(
      'does not query %s as an occupying status',
      async (status) => {
        const { guard, prisma } = setup();

        await expect(
          guard.canGenerate({
            companyId: 'c1',
            customerId: 'u1',
            phone: '+5511999999999',
            now,
          }),
        ).resolves.toBe(true);

        expect(prisma.message.findMany).toHaveBeenCalledWith({
          where: expect.objectContaining({
            status: {
              in: [
                MessageStatus.PENDING,
                MessageStatus.PROCESSING,
                MessageStatus.SENT,
              ],
            },
          }),
          select: expect.any(Object),
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
        });
        expect(
          prisma.message.findMany.mock.calls[0][0].where.status.in,
        ).not.toContain(status);
      },
    );

    it('isolates candidates by company and Sao Paulo calendar day', async () => {
      const { guard, prisma } = setup();

      await guard.canGenerate({
        companyId: 'c1',
        customerId: 'u1',
        phone: '+5511999999999',
        now: new Date('2026-09-05T01:30:00.000Z'),
      });

      expect(prisma.message.findMany).toHaveBeenCalledWith({
        where: {
          companyId: 'c1',
          automaticCampaignId: { not: null },
          status: {
            in: [
              MessageStatus.PENDING,
              MessageStatus.PROCESSING,
              MessageStatus.SENT,
            ],
          },
          createdAt: {
            gte: new Date('2026-09-04T03:00:00.000Z'),
            lte: new Date('2026-09-05T02:59:59.999Z'),
          },
        },
        select: expect.any(Object),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    });
  });

  describe('claimForProcessing', () => {
    it('locks sorted identity keys and aborts a later duplicate', async () => {
      const { guard, tx } = setup();
      tx.message.findUnique.mockResolvedValue(
        candidate({
          id: 'current',
          status: MessageStatus.PROCESSING,
          createdAt: new Date('2026-09-04T13:00:00.000Z'),
        }),
      );
      tx.message.findMany.mockResolvedValue([
        candidate({ phone: '(11) 99999-9999' }),
      ]);

      await expect(guard.claimForProcessing('current')).resolves.toEqual({
        allowed: false,
        blockerId: 'blocker',
      });

      expect(tx.$queryRaw).toHaveBeenCalledTimes(2);
      expect(tx.message.updateMany).toHaveBeenCalledWith({
        where: { id: 'current', status: MessageStatus.PROCESSING },
        data: {
          status: MessageStatus.ABORTED,
          error: DAILY_AUTOMATIC_DUPLICATE_ERROR,
        },
      });
      expect(tx.message.findMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          companyId: 'c1',
          automaticCampaignId: { not: null },
          status: {
            in: [
              MessageStatus.PENDING,
              MessageStatus.PROCESSING,
              MessageStatus.SENT,
            ],
          },
          OR: [
            { createdAt: { lt: new Date('2026-09-04T13:00:00.000Z') } },
            {
              createdAt: new Date('2026-09-04T13:00:00.000Z'),
              id: { lt: 'current' },
            },
          ],
        }),
        select: expect.any(Object),
        orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
      });
    });

    it('allows the deterministic first message', async () => {
      const { guard, tx } = setup();
      tx.message.findUnique.mockResolvedValue(
        candidate({
          id: 'first',
          status: MessageStatus.PROCESSING,
        }),
      );

      await expect(guard.claimForProcessing('first')).resolves.toEqual({
        allowed: true,
      });
      expect(tx.message.updateMany).not.toHaveBeenCalled();
    });
  });
});
