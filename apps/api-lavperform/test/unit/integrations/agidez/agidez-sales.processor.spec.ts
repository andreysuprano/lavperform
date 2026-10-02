import { Job } from 'bull';
import { AgidezSalesProcessor } from 'src/integrations/agidez/infrastructure/jobs/agidez-sales.processor';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

const PROCESS_METADATA = 'bull:module_queue_process';

function salesJob(
  data: {
    companyId: string;
    date?: string;
    backfill90?: boolean;
    syncCustomers?: boolean;
  },
  attemptsMade: number,
): Job {
  return {
    data,
    attemptsMade,
    opts: { attempts: 3, jobId: 'agidez-job' },
    id: 'agidez-job',
  } as Job;
}

describe('AgidezSalesProcessor', () => {
  it('processa a fila de importação com concorrência 1', () => {
    const options = Reflect.getMetadata(
      PROCESS_METADATA,
      AgidezSalesProcessor.prototype.processImport,
    );

    expect(options).toEqual(
      expect.objectContaining({
        name: QUEUE_NAMES.AGIDEZ_SALES_IMPORT,
        concurrency: 1,
      }),
    );
  });

  it('sincroniza clientes e não importa vendas quando o job só pede sync', async () => {
    const agidezSalesService = {
      syncCustomers: jest.fn().mockResolvedValue(undefined),
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await processor.processImport(
      salesJob({ companyId: 'company-1', syncCustomers: true }, 0),
    );

    expect(agidezSalesService.syncCustomers).toHaveBeenCalledWith('company-1');
    expect(agidezSalesService.importHistoricalSales).not.toHaveBeenCalled();
    expect(agidezSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('sincroniza clientes antes do backfill quando os dois vêm no job', async () => {
    const order: string[] = [];
    const agidezSalesService = {
      syncCustomers: jest.fn(async () => {
        order.push('sync');
      }),
      importHistoricalSales: jest.fn(async () => {
        order.push('backfill');
        return { jobsCreated: 90 };
      }),
      processDailySales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await processor.processImport(
      salesJob(
        { companyId: 'company-1', syncCustomers: true, backfill90: true },
        0,
      ),
    );

    expect(order).toEqual(['sync', 'backfill']);
    expect(agidezSalesService.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      {},
    );
    expect(agidezSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('importa o dia pedido no job da fila', async () => {
    const agidezSalesService = {
      syncCustomers: jest.fn(),
      processDailySales: jest.fn().mockResolvedValue(undefined),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await processor.processImport(
      salesJob({ companyId: 'company-1', date: '2026-09-01' }, 0),
    );

    expect(agidezSalesService.processDailySales).toHaveBeenCalledWith(
      'company-1',
      '2026-09-01',
    );
    expect(agidezSalesService.importHistoricalSales).not.toHaveBeenCalled();
    expect(agidezSalesService.syncCustomers).not.toHaveBeenCalled();
  });

  it('importa 90 dias quando o job pede backfill', async () => {
    const agidezSalesService = {
      syncCustomers: jest.fn(),
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockResolvedValue({
        message: 'ok',
        totalDays: 90,
        jobsCreated: 90,
      }),
    };
    const alert = { notify: jest.fn() };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await processor.processImport(
      salesJob({ companyId: 'company-1', backfill90: true }, 0),
    );

    expect(agidezSalesService.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      {},
    );
    expect(agidezSalesService.processDailySales).not.toHaveBeenCalled();
    expect(agidezSalesService.syncCustomers).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do catch-up e relança o erro', async () => {
    const error = new Error('api fora');
    const agidezSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      importHistoricalSales: jest.fn(),
      syncCustomers: jest.fn(),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await expect(
      processor.processImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'agidez',
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
    const agidezSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn() };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await expect(
      processor.processImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 0),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do backfill e relança o erro', async () => {
    const error = new Error('historico falhou');
    const agidezSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockRejectedValue(error),
      syncCustomers: jest.fn(),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new AgidezSalesProcessor(
      agidezSalesService as any,
      alert as any,
    );

    await expect(
      processor.processImport(
        salesJob({ companyId: 'company-1', backfill90: true }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'agidez',
        companyId: 'company-1',
        kind: 'backfill90',
        attempts: 3,
        error,
      }),
    );
    expect(agidezSalesService.processDailySales).not.toHaveBeenCalled();
  });
});
