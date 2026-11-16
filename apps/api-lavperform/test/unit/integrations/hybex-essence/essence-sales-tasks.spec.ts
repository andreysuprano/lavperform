import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { HybexEssenceSalesTasks } from '../../../../src/integrations/hybex-essence/crons/essence-sales-tasks';
import { PrismaService } from '../../../../src/prisma/prisma.service';
import { QUEUE_NAMES } from '../../../../src/common/queue/queue.constants';
import { enqueueSalesImportJob } from '../../../../src/integrations/sales-import/sales-import-queue';

jest.mock('../../../../src/integrations/sales-import/sales-import-queue', () => ({
  enqueueSalesImportJob: jest.fn(),
  buildSalesImportJobOptions: jest.fn((jobId: string) => ({ jobId })),
}));

const ESSENCE_PARTNER_FILTER = {
  partnerSlug: 'HYBEX_ESSENCE',
};

describe('HybexEssenceSalesTasks', () => {
  let tasks: HybexEssenceSalesTasks;
  const enqueueSalesImportJobMock = enqueueSalesImportJob as jest.Mock;

  beforeEach(async () => {
    enqueueSalesImportJobMock.mockReset();
    enqueueSalesImportJobMock.mockResolvedValue('queued');

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HybexEssenceSalesTasks,
        {
          provide: PrismaService,
          useValue: {
            company: {
              findMany: jest.fn().mockResolvedValue([
                { id: 'company-1', name: 'MAYTA', digitalMenuIntegration: [] },
              ]),
            },
          },
        },
        {
          provide: getQueueToken(QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT),
          useValue: {},
        },
      ],
    }).compile();

    tasks = module.get(HybexEssenceSalesTasks);
  });

  it('enfileira hoje e ontem para empresas com integração Essence', async () => {
    const prisma = (tasks as unknown as { prisma: PrismaService }).prisma;

    await tasks.handleDailySalesImport();

    expect(prisma.company.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          digitalMenuIntegration: {
            some: {
              active: true,
              partner: ESSENCE_PARTNER_FILTER,
            },
          },
        }),
      }),
    );
    expect(enqueueSalesImportJobMock).toHaveBeenCalledTimes(2);
    expect(enqueueSalesImportJobMock).toHaveBeenCalledWith(
      expect.anything(),
      QUEUE_NAMES.HYBEX_ESSENCE_SALES_IMPORT,
      expect.objectContaining({ companyId: 'company-1' }),
      expect.anything(),
    );
  });
});