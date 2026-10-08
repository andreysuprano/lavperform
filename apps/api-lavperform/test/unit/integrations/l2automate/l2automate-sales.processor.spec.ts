import { Job } from 'bull';
import { L2AutomateSalesProcessor } from 'src/integrations/l2automate/infrastructure/jobs/l2automate-sales.processor';
import { weeklyReplayRange } from 'src/integrations/sales-import/sales-import-schedule';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

const PROCESS_METADATA = 'bull:module_queue_process';

function salesJob(
  data: { companyId: string; date?: string; backfill90?: boolean },
  attemptsMade: number,
): Job {
  return {
    data,
    attemptsMade,
    opts: { attempts: 3, jobId: 'l2automate-job' },
    id: 'l2automate-job',
  } as Job;
}

describe('L2AutomateSalesProcessor', () => {
  it('processa a fila de importação com concorrência 1', () => {
    const options = Reflect.getMetadata(
      PROCESS_METADATA,
      L2AutomateSalesProcessor.prototype.processSalesImport,
    );

    expect(options).toEqual(
      expect.objectContaining({
        name: QUEUE_NAMES.L2AUTOMATE_SALES_IMPORT,
        concurrency: 1,
      }),
    );
  });

  it('importa o dia pedido no job da fila', async () => {
    const l2AutomateSalesService = {
      processDailySales: jest.fn().mockResolvedValue(undefined),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new L2AutomateSalesProcessor(
      l2AutomateSalesService as any,
      alert as any,
    );

    await processor.processSalesImport(
      salesJob({ companyId: 'company-1', date: '2026-09-01' }, 0),
    );

    expect(l2AutomateSalesService.processDailySales).toHaveBeenCalledWith(
      'company-1',
      '2026-09-01',
    );
    expect(l2AutomateSalesService.importHistoricalSales).not.toHaveBeenCalled();
  });

  it('reexecuta os últimos 7 dias quando o job pede backfill', async () => {
    const l2AutomateSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockResolvedValue({
        message: 'ok',
        totalDays: 90,
        jobsCreated: 90,
      }),
    };
    const alert = { notify: jest.fn() };
    const processor = new L2AutomateSalesProcessor(
      l2AutomateSalesService as any,
      alert as any,
    );

    await processor.processSalesImport(
      salesJob({ companyId: 'company-1', backfill90: true }, 0),
    );

    expect(l2AutomateSalesService.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      weeklyReplayRange(),
    );
    expect(l2AutomateSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do catch-up e relança o erro', async () => {
    const error = new Error('api fora');
    const l2AutomateSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new L2AutomateSalesProcessor(
      l2AutomateSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'l2automate',
        companyId: 'company-1',
        kind: 'catchup',
        date: '2026-10-02',
        attempts: 3,
        error,
      }),
    );
  });

  it('não avisa o alerta antes da última tentativa e relança o erro', async () => {
    const error = new Error('api fora');
    const l2AutomateSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn() };
    const processor = new L2AutomateSalesProcessor(
      l2AutomateSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 0),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do backfill e relança o erro', async () => {
    const error = new Error('historico falhou');
    const l2AutomateSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new L2AutomateSalesProcessor(
      l2AutomateSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', backfill90: true }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'l2automate',
        companyId: 'company-1',
        kind: 'backfill90',
        attempts: 3,
        error,
      }),
    );
    expect(l2AutomateSalesService.processDailySales).not.toHaveBeenCalled();
  });
});
