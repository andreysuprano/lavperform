import { Job } from 'bull';
import { WindelSalesProcessor } from 'src/integrations/windel/infrastructure/jobs/windel-sales.processor';
import { WindelSaleProcessor } from 'src/integrations/windel/infrastructure/jobs/windel-sale.processor';
import { WindelMfaRequiredError, WindelLoginRejectedError } from 'src/integrations/windel/api/windel.service';
import { windelReplayRange } from 'src/integrations/windel/windel-lookback';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

const PROCESS_METADATA = 'bull:module_queue_process';

function salesJob(
  data: { companyId: string; date?: string; backfill90?: boolean },
  attemptsMade: number,
): Job {
  return {
    data,
    attemptsMade,
    opts: { attempts: 3, jobId: 'windel-job' },
    id: 'windel-job',
  } as Job;
}

describe('WindelSalesProcessor', () => {
  it('processa a fila de importação com concorrência 1', () => {
    const options = Reflect.getMetadata(
      PROCESS_METADATA,
      WindelSalesProcessor.prototype.processSalesImport,
    );

    expect(options).toEqual(
      expect.objectContaining({
        name: QUEUE_NAMES.WINDEL_SALES_IMPORT,
        concurrency: 1,
      }),
    );
  });

  it('importa o dia pedido no job da fila', async () => {
    const windelSalesService = {
      processDailySales: jest.fn().mockResolvedValue(undefined),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );

    await processor.processSalesImport(
      salesJob({ companyId: 'company-1', date: '2026-09-01' }, 0),
    );

    expect(windelSalesService.processDailySales).toHaveBeenCalledWith(
      'company-1',
      '2026-09-01',
    );
    expect(windelSalesService.importHistoricalSales).not.toHaveBeenCalled();
  });

  it('reexecuta os últimos 7 dias quando o job pede backfill', async () => {
    const windelSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockResolvedValue({
        message: 'ok',
        totalDays: 7,
        jobsCreated: 7,
      }),
    };
    const alert = { notify: jest.fn() };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );

    await processor.processSalesImport(
      salesJob({ companyId: 'company-1', backfill90: true }, 0),
    );

    expect(windelSalesService.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      windelReplayRange(),
    );
    expect(windelSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do catch-up e relança o erro', async () => {
    const error = new Error('api fora');
    const windelSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'windel',
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
    const windelSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn() };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
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
    const windelSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', backfill90: true }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'windel',
        companyId: 'company-1',
        kind: 'backfill90',
        attempts: 3,
        error,
      }),
    );
    expect(windelSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('avisa na hora e descarta novas tentativas quando a Windel pede segundo fator', async () => {
    const error = new WindelMfaRequiredError();
    const windelSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      importHistoricalSales: jest.fn(),
      blockAuth: jest.fn().mockResolvedValue(undefined),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );
    const job = salesJob({ companyId: 'company-1', date: '2026-10-20' }, 0);
    job.discard = jest.fn();

    await expect(processor.processSalesImport(job)).rejects.toBe(error);

    expect(job.discard).toHaveBeenCalled();
    expect(windelSalesService.blockAuth).toHaveBeenCalledWith(
      'company-1',
      'WindelMfaRequiredError',
    );
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'windel',
        companyId: 'company-1',
        kind: 'catchup',
        date: '2026-10-20',
        attempts: 1,
        error,
      }),
    );
  });

  it('descarta o job quando o login é recusado', async () => {
    const error = new WindelLoginRejectedError();
    const windelSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      blockAuth: jest.fn().mockResolvedValue(undefined),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new WindelSalesProcessor(
      windelSalesService as any,
      alert as any,
    );
    const job = salesJob({ companyId: 'company-1', date: '2026-10-20' }, 0);
    job.discard = jest.fn();

    await expect(processor.processSalesImport(job)).rejects.toBe(error);

    expect(job.discard).toHaveBeenCalled();
    expect(windelSalesService.blockAuth).toHaveBeenCalledWith(
      'company-1',
      'WindelLoginRejectedError',
    );
    expect(alert.notify).toHaveBeenCalled();
  });
});

describe('WindelSaleProcessor', () => {
  it('processa a ordem com concorrência 100', () => {
    const options = Reflect.getMetadata(
      PROCESS_METADATA,
      WindelSaleProcessor.prototype.processSale,
    );

    expect(options).toEqual(
      expect.objectContaining({
        name: QUEUE_NAMES.WINDEL_SALE_PROCESS,
        concurrency: 100,
      }),
    );
  });

  it('grava a ordem e a pessoa recebidas no job', async () => {
    const windelSalesService = {
      processSale: jest.fn().mockResolvedValue(undefined),
    };
    const processor = new WindelSaleProcessor(windelSalesService as any);
    const order = { id: 11, numero: 1, createdAt: '2026-10-20T00:00:00.000Z' };
    const person = { nome: 'Ana', telefone: '11999999999' };

    await processor.processSale({
      data: { companyId: 'company-1', order, person },
    } as any);

    expect(windelSalesService.processSale).toHaveBeenCalledWith(
      'company-1',
      order,
      person,
    );
  });

  it('relança o erro da ordem', async () => {
    const error = new Error('falha ao gravar');
    const windelSalesService = {
      processSale: jest.fn().mockRejectedValue(error),
    };
    const processor = new WindelSaleProcessor(windelSalesService as any);

    await expect(
      processor.processSale({
        data: {
          companyId: 'company-1',
          order: { id: 11, numero: 1, createdAt: '2026-10-20T00:00:00.000Z' },
          person: null,
        },
      } as any),
    ).rejects.toBe(error);
  });
});
