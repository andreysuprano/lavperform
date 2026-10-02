import { Job } from 'bull';
import { VmLavSalesProcessor } from 'src/integrations/vmlav/infrastructure/jobs/vmlav-sales.processor';
import { VmLavSaleProcessor } from 'src/integrations/vmlav/infrastructure/jobs/vmlav-sale.processor';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

const PROCESS_METADATA = 'bull:module_queue_process';

function salesJob(
  data: { companyId: string; date?: string; backfill90?: boolean },
  attemptsMade: number,
): Job {
  return {
    data,
    attemptsMade,
    opts: { attempts: 3, jobId: 'vmlav-job' },
    id: 'vmlav-job',
  } as Job;
}

describe('VmLav processors', () => {
  it('processa a fila de importação com concorrência 1', () => {
    const options = Reflect.getMetadata(
      PROCESS_METADATA,
      VmLavSalesProcessor.prototype.processSalesImport,
    );

    expect(options).toEqual(
      expect.objectContaining({
        name: QUEUE_NAMES.VMLAV_SALES_IMPORT,
        concurrency: 1,
      }),
    );
  });

  it('devolve o resultado da importação diária no job da fila', async () => {
    const vmLavSalesService = {
      processDailySales: jest.fn().mockResolvedValue({
        companyId: 'company-1',
        date: '2026-09-01',
        cnpj: '12345678000190',
        salesFound: 0,
        enqueued: 0,
      }),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn() };
    const processor = new VmLavSalesProcessor(
      vmLavSalesService as any,
      alert as any,
    );

    const result = await processor.processSalesImport(
      salesJob({ companyId: 'company-1', date: '2026-09-01' }, 0),
    );

    expect(vmLavSalesService.processDailySales).toHaveBeenCalledWith(
      'company-1',
      '2026-09-01',
    );
    expect(vmLavSalesService.importHistoricalSales).not.toHaveBeenCalled();

    expect(result).toEqual({
      companyId: 'company-1',
      date: '2026-09-01',
      cnpj: '12345678000190',
      salesFound: 0,
      enqueued: 0,
    });
  });

  it('importa 90 dias quando o job pede backfill', async () => {
    const vmLavSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockResolvedValue({
        message: 'ok',
        totalDays: 90,
        jobsCreated: 90,
      }),
    };
    const alert = { notify: jest.fn() };
    const processor = new VmLavSalesProcessor(
      vmLavSalesService as any,
      alert as any,
    );

    await processor.processSalesImport(
      salesJob({ companyId: 'company-1', backfill90: true }, 0),
    );

    expect(vmLavSalesService.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      {},
    );
    expect(vmLavSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('avisa o alerta na última falha do catch-up e relança o erro', async () => {
    const error = new Error('api fora');
    const vmLavSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
      importHistoricalSales: jest.fn(),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new VmLavSalesProcessor(
      vmLavSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', date: '2026-10-02' }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'vmlav',
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
    const vmLavSalesService = {
      processDailySales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn() };
    const processor = new VmLavSalesProcessor(
      vmLavSalesService as any,
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
    const vmLavSalesService = {
      processDailySales: jest.fn(),
      importHistoricalSales: jest.fn().mockRejectedValue(error),
    };
    const alert = { notify: jest.fn().mockResolvedValue(undefined) };
    const processor = new VmLavSalesProcessor(
      vmLavSalesService as any,
      alert as any,
    );

    await expect(
      processor.processSalesImport(
        salesJob({ companyId: 'company-1', backfill90: true }, 2),
      ),
    ).rejects.toBe(error);

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'vmlav',
        companyId: 'company-1',
        kind: 'backfill90',
        attempts: 3,
        error,
      }),
    );
    expect(vmLavSalesService.processDailySales).not.toHaveBeenCalled();
  });

  it('devolve o resultado do processamento da venda no job da fila', async () => {
    const vmLavSalesService = {
      processSale: jest.fn().mockResolvedValue({
        status: 'queued',
        saleId: 9001,
      }),
    };
    const processor = new VmLavSaleProcessor(vmLavSalesService as any);

    const result = await processor.processSale({
      data: {
        companyId: 'company-1',
        sale: { idVenda: 9001, nomeCliente: '' },
        apiKey: 'api-key',
        partnerId: 'partner-1',
      },
    } as Job<any>);

    expect(result).toEqual({ status: 'queued', saleId: 9001 });
  });
});
