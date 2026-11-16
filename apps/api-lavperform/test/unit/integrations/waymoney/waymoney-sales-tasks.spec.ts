import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { WaymoneySalesTasks } from 'src/integrations/waymoney/crons/waymoney-sales-tasks';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { RedisService } from 'src/common/redis/redis.service';
import {
  salesBackfill90JobId,
  salesCatchupJobId,
} from 'src/integrations/sales-import/sales-import-schedule';
import { waymoneyCatchupDates } from 'src/integrations/waymoney/waymoney-day';
import { waymoneyAuthBlockKey } from 'src/integrations/waymoney/waymoney-auth-block';

const NOW = new Date('2026-11-09T15:10:00.000Z');

describe('WaymoneySalesTasks', () => {
  const prisma = { company: { findMany: jest.fn() } };
  const queue = { add: jest.fn(), getJob: jest.fn() };
  const redis = { getJson: jest.fn() };
  let tasks: WaymoneySalesTasks;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        WaymoneySalesTasks,
        { provide: PrismaService, useValue: prisma },
        { provide: getQueueToken(QUEUE_NAMES.WAYMONEY_SALES_IMPORT), useValue: queue },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    tasks = module.get(WaymoneySalesTasks);
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    queue.add.mockResolvedValue({ id: 'job', timestamp: 2 });
    queue.getJob.mockResolvedValue(null);
    redis.getJson.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enfileira hoje e ontem e pula empresa com login bloqueado', async () => {
    prisma.company.findMany.mockResolvedValue([
      { id: 'company-1', name: 'Loja' },
      { id: 'company-2', name: 'Bloqueada' },
    ]);
    redis.getJson.mockImplementation(async (key: string) =>
      key === waymoneyAuthBlockKey('company-2') ? { reason: 'login' } : null,
    );
    const { today, yesterday } = waymoneyCatchupDates(NOW);

    await tasks.handleDailySalesImport();

    expect(queue.add).toHaveBeenCalledTimes(2);
    for (const date of [today, yesterday]) {
      expect(queue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
        { companyId: 'company-1', date },
        expect.objectContaining({
          jobId: salesCatchupJobId('waymoney', 'company-1', date, NOW),
        }),
      );
    }
  });

  it('na segunda enfileira o replay de 7 dias', async () => {
    prisma.company.findMany.mockResolvedValue([{ id: 'company-1', name: 'Loja' }]);

    await tasks.handleWeeklyBackfill();

    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.WAYMONEY_SALES_IMPORT,
      { companyId: 'company-1', backfill90: true },
      expect.objectContaining({
        jobId: salesBackfill90JobId('waymoney', 'company-1'),
      }),
    );
  });
});
