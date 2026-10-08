import { CiccloSalesService } from 'src/integrations/cicclo/application/cicclo-sales.service';
import { L2AutomateSalesService } from 'src/integrations/l2automate/application/l2automate-sales.service';
import { MaxlavSalesService } from 'src/integrations/maxlav/application/maxlav-sales.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import {
  buildSalesImportJobOptions,
  enqueueSalesImportJob,
} from 'src/integrations/sales-import/sales-import-queue';
import {
  salesDailyImportJobId,
  SalesImportPartnerSlug,
} from 'src/integrations/sales-import/sales-import-schedule';

const integration = { merchantId: 'loja', apiKey: 'key' };

function queueDouble(duplicateJobId?: string) {
  return {
    add: jest.fn(async (_name: string, _data: unknown, opts: { jobId: string }) => ({
      id: opts.jobId,
      timestamp: 2_000,
    })),
    getJob: jest.fn(async (jobId: string) => ({
      id: jobId,
      timestamp: jobId === duplicateJobId ? 1_000 : 2_000,
    })),
  };
}

describe('importHistoricalSales diário', () => {
  it('Cicclo, Maxlav e L2 usam jobId estável por empresa e data', async () => {
    const cases: Array<{
      partner: SalesImportPartnerSlug;
      queueName: string;
      run: (queue: ReturnType<typeof queueDouble>) => Promise<{ jobsCreated: number }>;
    }> = [
      {
        partner: 'cicclo',
        queueName: QUEUE_NAMES.CICCLO_SALES_IMPORT,
        run: (queue) =>
          new CiccloSalesService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            queue as any,
            {} as any,
          ).importHistoricalSales('company-1', {
            startDate: '2026-09-01',
            endDate: '2026-09-02',
          }, integration as any),
      },
      {
        partner: 'maxlav',
        queueName: QUEUE_NAMES.MAXLAV_SALES_IMPORT,
        run: (queue) =>
          new MaxlavSalesService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            queue as any,
            {} as any,
          ).importHistoricalSales('company-1', {
            startDate: '2026-09-01',
            endDate: '2026-09-02',
          }, integration as any),
      },
      {
        partner: 'l2automate',
        queueName: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT,
        run: (queue) =>
          new L2AutomateSalesService(
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            {} as any,
            queue as any,
            {} as any,
          ).importHistoricalSales('company-1', {
            startDate: '2026-09-01',
            endDate: '2026-09-02',
          }, integration as any),
      },
    ];

    for (const item of cases) {
      const queue = queueDouble();
      const result = await item.run(queue);

      expect(result.jobsCreated).toBe(2);
      expect(queue.add).toHaveBeenCalledTimes(2);
      for (const date of ['2026-09-01', '2026-09-02']) {
        expect(queue.add).toHaveBeenCalledWith(
          item.queueName,
          { companyId: 'company-1', date },
          buildSalesImportJobOptions(
            salesDailyImportJobId(item.partner, 'company-1', date),
          ),
        );
      }
    }
  });

  it('não recria o dia que já está na fila', async () => {
    const duplicateJobId = salesDailyImportJobId(
      'cicclo',
      'company-1',
      '2026-09-01',
    );
    const queue = queueDouble(duplicateJobId);
    const service = new CiccloSalesService(
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      {} as any,
      queue as any,
      {} as any,
    );

    const result = await service.importHistoricalSales(
      'company-1',
      { startDate: '2026-09-01', endDate: '2026-09-02' },
      integration as any,
    );

    expect(result.jobsCreated).toBe(1);
    await expect(
      enqueueSalesImportJob(
        queue as any,
        QUEUE_NAMES.CICCLO_SALES_IMPORT,
        { companyId: 'company-1', date: '2026-09-01' },
        buildSalesImportJobOptions(duplicateJobId),
      ),
    ).resolves.toBe('skipped');
  });
});
