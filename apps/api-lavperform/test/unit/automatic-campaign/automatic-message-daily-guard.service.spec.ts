import { MessageStatus } from '@prisma/client';
import { Logger } from '@nestjs/common';
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
      $executeRawUnsafe: jest.fn().mockResolvedValue(0),
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

    it('loads one daily snapshot for multiple candidate identities', async () => {
      const { guard, prisma } = setup();
      prisma.message.findMany.mockResolvedValue([
        candidate({
          id: 'winner-1',
          customerId: 'u1',
          phone: '+5511111111111',
        }),
        candidate({ id: 'winner-2', customerId: 'u2', phone: '11 99999-9999' }),
      ]);

      const snapshot = await guard.loadDailySnapshot({
        companyId: 'c1',
        now,
      });

      expect(
        snapshot.canGenerate({ customerId: 'u1', phone: '+5522222222222' }),
      ).toBe(false);
      expect(
        snapshot.canGenerate({
          customerId: 'u3',
          phone: '+55 (11) 99999-9999',
        }),
      ).toBe(false);
      expect(
        snapshot.canGenerate({ customerId: 'u3', phone: '+5533333333333' }),
      ).toBe(true);
      expect(
        snapshot.tryReserve({
          id: 'winner-3',
          customerId: 'u3',
          phone: '+5533333333333',
        }),
      ).toEqual({ allowed: true });
      expect(
        snapshot.tryReserve({
          id: 'loser-4',
          customerId: 'u4',
          phone: '+55 33 33333-3333',
        }),
      ).toEqual({ allowed: false, blockerId: 'winner-3' });
      expect(prisma.message.findMany).toHaveBeenCalledTimes(1);
    });

    it('preserves greedy transitivity and blocker ids through the shared snapshot API', async () => {
      const { guard, prisma } = setup();
      prisma.message.findMany.mockResolvedValue([
        candidate({ id: 'Z', customerId: 'u1', phone: 'P1' }),
        candidate({ id: 'X', customerId: 'u1', phone: 'P2' }),
      ]);
      const snapshot = await guard.loadDailySnapshot({
        companyId: 'c1',
        now,
      });

      expect(
        snapshot.tryReserve({ id: 'B', customerId: 'u2', phone: 'P2' }),
      ).toEqual({ allowed: true });
      expect(
        snapshot.tryReserve({ id: 'C', customerId: 'u3', phone: 'P2' }),
      ).toEqual({ allowed: false, blockerId: 'B' });
      expect(
        snapshot.tryReserve({ id: 'D', customerId: 'u1', phone: 'P3' }),
      ).toEqual({ allowed: false, blockerId: 'Z' });
      expect(prisma.message.findMany).toHaveBeenCalledTimes(1);
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

      expect(tx.$executeRawUnsafe).toHaveBeenCalledWith(
        "SET LOCAL lock_timeout = '5000ms'",
      );
      expect(tx.$queryRaw.mock.calls.map((call) => call[1])).toEqual([
        'c1:2026-09-04:customer:u1',
        'c1:2026-09-04:phone:5511999999999',
      ]);
      expect(tx.message.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'current',
          status: {
            in: [MessageStatus.PENDING, MessageStatus.PROCESSING],
          },
        },
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

    it('returns blocked without looping when PROCESSING changes to PENDING before abort', async () => {
      const { guard, tx } = setup();
      const warn = jest.spyOn(Logger.prototype, 'warn').mockImplementation();
      tx.message.findUnique.mockResolvedValueOnce(
        candidate({
          id: 'current',
          status: MessageStatus.PROCESSING,
          createdAt: new Date('2026-09-04T13:00:00.000Z'),
        }),
      );
      tx.message.findMany.mockResolvedValue([candidate()]);
      tx.message.updateMany.mockResolvedValue({ count: 0 });

      await expect(guard.claimForProcessing('current')).resolves.toEqual({
        allowed: false,
        blockerId: 'blocker',
      });

      expect(tx.message.updateMany).toHaveBeenCalledTimes(1);
      expect(tx.message.findUnique).toHaveBeenCalledTimes(1);
      expect(warn).toHaveBeenCalledWith(
        'Mensagem current continuou bloqueada, mas seu estado mudou antes do aborto',
      );
      warn.mockRestore();
    });

    it('uses greedy chronological winners for a transitive identity chain', async () => {
      const { guard, tx } = setup();
      tx.message.findUnique.mockResolvedValue(
        candidate({
          id: 'B',
          customerId: 'u2',
          phone: 'P2',
          status: MessageStatus.PROCESSING,
          createdAt: new Date('2026-09-04T14:00:00.000Z'),
        }),
      );
      tx.message.findMany.mockResolvedValue([
        candidate({
          id: 'Z',
          customerId: 'u1',
          phone: 'P1',
          createdAt: new Date('2026-09-04T12:00:00.000Z'),
        }),
        candidate({
          id: 'X',
          customerId: 'u1',
          phone: 'P2',
          createdAt: new Date('2026-09-04T13:00:00.000Z'),
        }),
      ]);

      await expect(guard.claimForProcessing('B')).resolves.toEqual({
        allowed: true,
      });
      expect(tx.message.updateMany).not.toHaveBeenCalled();
    });

    it('propagates lock timeout for retry without allowing the message', async () => {
      const { guard, prisma, tx } = setup();
      tx.message.findUnique.mockResolvedValue(
        candidate({
          id: 'current',
          status: MessageStatus.PROCESSING,
        }),
      );
      tx.$queryRaw.mockRejectedValue(
        new Error('canceling statement due to lock timeout'),
      );

      await expect(guard.claimForProcessing('current')).rejects.toThrow(
        'lock timeout',
      );

      expect(tx.message.findMany).not.toHaveBeenCalled();
      expect(tx.message.updateMany).not.toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalledWith(expect.any(Function), {
        maxWait: 5000,
        timeout: 15000,
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
