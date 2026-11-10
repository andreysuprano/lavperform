import { WaymoneySalesProcessor } from 'src/integrations/waymoney/infrastructure/jobs/waymoney-sales.processor';
import { WaymoneyLoginRejectedError } from 'src/integrations/waymoney/api/waymoney.service';
import { weeklyReplayRange } from 'src/integrations/sales-import/sales-import-schedule';

function job(overrides: Record<string, unknown> = {}) {
  return {
    data: { companyId: 'company-1', date: '2026-11-09' },
    attemptsMade: 0,
    opts: { attempts: 3, jobId: 'waymoney-import:company-1:2026-11-09' },
    discard: jest.fn(),
    ...overrides,
  } as any;
}

describe('WaymoneySalesProcessor', () => {
  const sales = {
    processDailySales: jest.fn(),
    importHistoricalSales: jest.fn(),
    blockAuth: jest.fn(),
  };
  const alert = { notify: jest.fn() };
  const processor = new WaymoneySalesProcessor(sales as any, alert as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('chama a importação do dia e só alerta na última tentativa', async () => {
    await processor.processSalesImport(job());
    expect(sales.processDailySales).toHaveBeenCalledWith(
      'company-1',
      '2026-11-09',
    );
    expect(alert.notify).not.toHaveBeenCalled();

    sales.processDailySales.mockRejectedValueOnce(new Error('http'));
    await expect(
      processor.processSalesImport(job({ attemptsMade: 2 })),
    ).rejects.toThrow('http');
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ partner: 'waymoney', kind: 'catchup' }),
    );
  });

  it('reexecuta o histórico com os últimos 7 dias', async () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-11-09T15:00:00.000Z'));
    await processor.processSalesImport(
      job({ data: { companyId: 'company-1', backfill90: true } }),
    );
    expect(sales.importHistoricalSales).toHaveBeenCalledWith(
      'company-1',
      weeklyReplayRange(new Date('2026-11-09T15:00:00.000Z')),
    );
    jest.useRealTimers();
  });

  it('descarta o job e bloqueia o login quando a senha é recusada', async () => {
    const current = job();
    sales.processDailySales.mockRejectedValueOnce(new WaymoneyLoginRejectedError());

    await expect(processor.processSalesImport(current)).rejects.toBeInstanceOf(
      WaymoneyLoginRejectedError,
    );

    expect(current.discard).toHaveBeenCalled();
    expect(sales.blockAuth).toHaveBeenCalledWith(
      'company-1',
      'WaymoneyLoginRejectedError',
    );
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ partner: 'waymoney', attempts: 1 }),
    );
  });
});
