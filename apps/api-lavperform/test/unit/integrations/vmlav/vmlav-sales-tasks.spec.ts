import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
const SCHEDULE_CRON_OPTIONS = 'SCHEDULE_CRON_OPTIONS';
import { VmLavSalesTasks } from 'src/integrations/vmlav/crons/vmlav-sales-tasks';
import { PrismaService } from 'src/prisma/prisma.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

describe('VmLavSalesTasks', () => {
  let tasks: VmLavSalesTasks;

  const mockPrisma = {
    company: {
      findMany: jest.fn(),
    },
  };

  const mockQueue = {
    add: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmLavSalesTasks,
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: getQueueToken(QUEUE_NAMES.VMLAV_SALES_IMPORT),
          useValue: mockQueue,
        },
      ],
    }).compile();

    tasks = module.get(VmLavSalesTasks);
    jest.clearAllMocks();
  });

  it('enfileira importação diária com jobId estável por empresa e data', async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      { id: 'company-1', name: 'Empresa 1' },
      { id: 'company-2', name: 'Empresa 2' },
    ]);
    mockQueue.add.mockResolvedValue({ id: 'job-1' });

    await tasks.handleDailySalesImport();

    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      {
        companyId: 'company-1',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
      expect.objectContaining({
        jobId: expect.stringMatching(/^vmlav-import:company-1:/),
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );

    expect(mockQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      {
        companyId: 'company-2',
        date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
      },
      expect.objectContaining({
        jobId: expect.stringMatching(/^vmlav-import:company-2:/),
      }),
    );
    expect(mockQueue.add).toHaveBeenCalledTimes(2);
  });

  it('continua enfileirando próxima empresa quando job ativo já existe', async () => {
    mockPrisma.company.findMany.mockResolvedValue([
      { id: 'company-1', name: 'Empresa 1' },
      { id: 'company-2', name: 'Empresa 2' },
    ]);
    mockQueue.add
      .mockRejectedValueOnce(new Error('Job already exists'))
      .mockResolvedValueOnce({ id: 'job-2' });

    await tasks.handleDailySalesImport();

    expect(mockQueue.add).toHaveBeenCalledTimes(2);
    expect(mockQueue.add).toHaveBeenLastCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      expect.objectContaining({ companyId: 'company-2' }),
      expect.objectContaining({
        jobId: expect.stringMatching(/^vmlav-import:company-2:/),
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('executa cron a cada 30 minutos', () => {
    const cronOptions = Reflect.getMetadata(
      SCHEDULE_CRON_OPTIONS,
      VmLavSalesTasks.prototype.handleDailySalesImport,
    );

    expect(cronOptions).toEqual(
      expect.objectContaining({ cronTime: '0 */30 * * * *' }),
    );
  });
});
