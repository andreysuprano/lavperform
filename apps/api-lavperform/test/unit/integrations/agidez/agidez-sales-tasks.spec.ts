import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
const SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';
import { AgidezSalesTasks } from 'src/integrations/agidez/crons/agidez-sales-tasks';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { getOpeningHoursTimezone } from 'src/common/utils/date.utils';
import {
  catchupDates,
  salesBackfill90JobId,
  salesCatchupJobId,
} from 'src/integrations/sales-import/sales-import-schedule';

const NOW = new Date('2026-10-02T14:10:00.000Z');

const AGIDEZ_PARTNER_FILTER = {
  partnerSlug: { in: ['HYBEX', 'AGIDEZ'] },
};

describe('AgidezSalesTasks', () => {
  let tasks: AgidezSalesTasks;

  const mockPrisma = {
    company: {
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
    getJob: jest.fn(),
  };

  const companies = [
    { id: 'company-1', name: 'Empresa 1' },
    { id: 'company-2', name: 'Empresa 2' },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgidezSalesTasks,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: getQueueToken(QUEUE_NAMES.AGIDEZ_SALES_IMPORT),
          useValue: mockQueue,
        },
      ],
    }).compile();

    tasks = module.get(AgidezSalesTasks);
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('enfileira hoje e ontem com jobId de slot para cada empresa', async () => {
    mockPrisma.company.findMany.mockResolvedValue(companies);
    mockQueue.add.mockResolvedValue({ id: 'job-1' });
    const { today, yesterday } = catchupDates(NOW);

    await tasks.handleDailySalesImport();

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          state: 'ACTIVE',
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: AGIDEZ_PARTNER_FILTER,
            },
          },
        }),
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledTimes(4);
    for (const companyId of ['company-1', 'company-2']) {
      for (const date of [today, yesterday]) {
        expect(mockQueue.add).toHaveBeenCalledWith(
          QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
          { companyId, date },
          expect.objectContaining({
            jobId: salesCatchupJobId('agidez', companyId, date, NOW),
            attempts: 3,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: true,
          }),
        );
      }
    }

    for (const call of mockQueue.add.mock.calls) {
      expect(call[1]).not.toHaveProperty('backfill90');
    }
  });

  it('continua enfileirando a empresa seguinte quando o primeiro job já existe', async () => {
    mockPrisma.company.findMany.mockResolvedValue(companies);
    const { today, yesterday } = catchupDates(NOW);
    const duplicateJobId = salesCatchupJobId('agidez', 'company-1', today, NOW);
    mockQueue.add.mockImplementation(async (_name, _data, opts) => ({
      id: opts.jobId,
      timestamp: 2_000,
    }));
    mockQueue.getJob.mockImplementation(async (jobId: string) => ({
      id: jobId,
      timestamp: jobId === duplicateJobId ? 1_000 : 2_000,
    }));

    await tasks.handleDailySalesImport();

    expect(mockQueue.add).toHaveBeenCalledTimes(4);
    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      { companyId: 'company-2', date: today },
      expect.objectContaining({
        jobId: salesCatchupJobId('agidez', 'company-2', today, NOW),
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      { companyId: 'company-2', date: yesterday },
      expect.objectContaining({
        jobId: salesCatchupJobId('agidez', 'company-2', yesterday, NOW),
      }),
    );
  });

  it('executa o catch-up a cada 30 minutos', () => {
    const cronOptions = Reflect.getMetadata(
      SCHEDULE_CRON_OPTIONS,
      AgidezSalesTasks.prototype.handleDailySalesImport,
    );

    expect(cronOptions).toEqual(
      expect.objectContaining({ cronTime: '*/30 * * * *' }),
    );
    expect(cronOptions?.cronTime).not.toBe('0 8-21 * * *');
    expect(cronOptions?.cronTime).not.toBe('0 */12 * * *');
  });

  it('enfileira a reexecução semanal por empresa', async () => {
    mockPrisma.company.findMany.mockResolvedValue(companies);
    mockQueue.add.mockResolvedValue({ id: 'job-backfill' });

    await tasks.handleWeeklyBackfill();

    expect(mockPrisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: AGIDEZ_PARTNER_FILTER,
            },
          },
        }),
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      { companyId: 'company-1', backfill90: true },
      expect.objectContaining({
        jobId: salesBackfill90JobId('agidez', 'company-1'),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
      { companyId: 'company-2', backfill90: true },
      expect.objectContaining({
        jobId: 'agidez-backfill-90:company-2',
      }),
    );
  });

  it('executa o backfill às 3h de segunda no fuso de funcionamento', () => {
    const cronOptions = Reflect.getMetadata(
      SCHEDULE_CRON_OPTIONS,
      AgidezSalesTasks.prototype.handleWeeklyBackfill,
    );

    expect(cronOptions).toEqual(
      expect.objectContaining({
        cronTime: '0 3 * * 1',
        timeZone: getOpeningHoursTimezone(),
      }),
    );
  });
});
