import { Test } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { SwlSalesTasks } from 'src/integrations/swl/crons/swl-sales-tasks';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { RedisService } from 'src/common/redis/redis.service';
import {
  salesBackfill90JobId,
  salesImportSlot,
} from 'src/integrations/sales-import/sales-import-schedule';
import {
  swlAuthBlockKey,
  swlTokenHash,
} from 'src/integrations/swl/swl-auth-block';

const NOW = new Date('2026-11-25T15:10:00.000Z');

function company(id: string, apiKey = `token-${id}`) {
  return {
    id,
    name: `Loja ${id}`,
    digitalMenuIntegration: [{ apiKey }],
  };
}

describe('SwlSalesTasks', () => {
  const prisma = {
    company: { findMany: jest.fn() },
    swlSyncState: { findUnique: jest.fn() },
  };
  const queue = { add: jest.fn(), getJob: jest.fn() };
  const redis = { getJson: jest.fn() };
  let tasks: SwlSalesTasks;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        SwlSalesTasks,
        { provide: PrismaService, useValue: prisma },
        {
          provide: getQueueToken(QUEUE_NAMES.SWL_SALES_IMPORT),
          useValue: queue,
        },
        { provide: RedisService, useValue: redis },
      ],
    }).compile();
    tasks = module.get(SwlSalesTasks);
    jest.clearAllMocks();
    jest.useFakeTimers();
    jest.setSystemTime(NOW);
    queue.add.mockResolvedValue({ id: 'job', timestamp: 2 });
    queue.getJob.mockResolvedValue(null);
    redis.getJson.mockResolvedValue(null);
    prisma.swlSyncState.findUnique.mockResolvedValue(null);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('busca só empresas ativas com integração SWL ativa e token', async () => {
    prisma.company.findMany.mockResolvedValue([]);

    await tasks.handleSalesSync();

    const args = prisma.company.findMany.mock.calls[0][0];
    expect(JSON.stringify(args)).toContain('SWL');
    expect(JSON.stringify(args)).toContain('ACTIVE');
  });

  it('empresa sem marco de atendimento enfileira a carga de 90 dias uma vez', async () => {
    prisma.company.findMany.mockResolvedValue([company('company-1')]);

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.SWL_SALES_IMPORT,
      { companyId: 'company-1', mode: 'historical' },
      expect.objectContaining({
        jobId: 'swl-backfill-90:company-1',
        attempts: 3,
      }),
    );
    expect(salesBackfill90JobId('swl', 'company-1')).toBe(
      'swl-backfill-90:company-1',
    );
  });

  it('marco de atendimento nulo no registro também enfileira a carga', async () => {
    prisma.company.findMany.mockResolvedValue([company('company-1')]);
    prisma.swlSyncState.findUnique.mockResolvedValue({
      attendancesWatermark: null,
    });

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.SWL_SALES_IMPORT,
      { companyId: 'company-1', mode: 'historical' },
      expect.objectContaining({ jobId: 'swl-backfill-90:company-1' }),
    );
  });

  it('empresa com marco enfileira a sincronização incremental do slot', async () => {
    prisma.company.findMany.mockResolvedValue([company('company-1')]);
    prisma.swlSyncState.findUnique.mockResolvedValue({
      attendancesWatermark: new Date('2026-11-25T14:00:00.000Z'),
    });

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.SWL_SALES_IMPORT,
      { companyId: 'company-1', mode: 'incremental' },
      expect.objectContaining({
        jobId: `swl-sync:company-1:${salesImportSlot(NOW)}`,
      }),
    );
    expect(salesImportSlot(NOW)).toBe('1500');
  });

  it('não enfileira empresa bloqueada com o mesmo token', async () => {
    prisma.company.findMany.mockResolvedValue([
      company('company-1'),
      company('company-2'),
    ]);
    redis.getJson.mockImplementation(async (key: string) =>
      key === swlAuthBlockKey('company-2')
        ? swlTokenHash('token-company-2')
        : null,
    );

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledTimes(1);
    expect(queue.add.mock.calls[0][1]).toEqual(
      expect.objectContaining({ companyId: 'company-1' }),
    );
  });

  it('empresa bloqueada com outro token volta a ser enfileirada', async () => {
    prisma.company.findMany.mockResolvedValue([
      company('company-2', 'token-novo'),
    ]);
    redis.getJson.mockResolvedValue(swlTokenHash('token-antigo'));

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledTimes(1);
  });

  it('não registra cron de segunda-feira', () => {
    expect(
      (tasks as unknown as Record<string, unknown>).handleWeeklyBackfill,
    ).toBeUndefined();
  });

  it('uma empresa com erro não impede as demais', async () => {
    prisma.company.findMany.mockResolvedValue([
      company('company-1'),
      company('company-2'),
    ]);
    queue.add.mockRejectedValueOnce(new Error('redis'));

    await tasks.handleSalesSync();

    expect(queue.add).toHaveBeenCalledTimes(2);
  });
});
