import { SwlSalesProcessor } from 'src/integrations/swl/infrastructure/jobs/swl-sales.processor';
import { SwlSaleProcessor } from 'src/integrations/swl/infrastructure/jobs/swl-sale.processor';
import { SwlPermanentHttpError } from 'src/integrations/swl/api/swl-http.error';

function job(overrides: Record<string, unknown> = {}) {
  return {
    data: { companyId: 'company-1', mode: 'incremental' },
    attemptsMade: 0,
    opts: { attempts: 3, jobId: 'swl-sync:company-1:1500' },
    discard: jest.fn(),
    ...overrides,
  } as any;
}

describe('SwlSalesProcessor', () => {
  const sales = { syncCompany: jest.fn() };
  const alert = { notify: jest.fn() };
  const processor = new SwlSalesProcessor(sales as any, alert as any);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('sincroniza no modo incremental', async () => {
    await processor.processSalesImport(job());

    expect(sales.syncCompany).toHaveBeenCalledWith(
      'company-1',
      'incremental',
      undefined,
    );
    expect(alert.notify).not.toHaveBeenCalled();
  });

  it('passa o período da carga histórica', async () => {
    await processor.processSalesImport(
      job({
        data: {
          companyId: 'company-1',
          mode: 'historical',
          startDate: '2026-08-01',
          endDate: '2026-11-09',
        },
      }),
    );

    expect(sales.syncCompany).toHaveBeenCalledWith('company-1', 'historical', {
      startDate: '2026-08-01',
      endDate: '2026-11-09',
    });
  });

  it('erro permanente descarta o job, alerta e não relança', async () => {
    const current = job();
    sales.syncCompany.mockRejectedValueOnce(new SwlPermanentHttpError(401));

    await expect(processor.processSalesImport(current)).resolves.toBeUndefined();

    expect(current.discard).toHaveBeenCalled();
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({
        partner: 'swl',
        companyId: 'company-1',
        kind: 'catchup',
        attempts: 1,
      }),
    );
  });

  it('400 também é permanente', async () => {
    sales.syncCompany.mockRejectedValueOnce(new SwlPermanentHttpError(400));

    await expect(
      processor.processSalesImport(job()),
    ).resolves.toBeUndefined();
  });

  it('erro transitório relança e só alerta na última tentativa', async () => {
    sales.syncCompany.mockRejectedValueOnce(new Error('503'));
    await expect(processor.processSalesImport(job())).rejects.toThrow('503');
    expect(alert.notify).not.toHaveBeenCalled();

    sales.syncCompany.mockRejectedValueOnce(new Error('503'));
    await expect(
      processor.processSalesImport(job({ attemptsMade: 2 })),
    ).rejects.toThrow('503');
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ partner: 'swl', attempts: 3 }),
    );
  });

  it('a carga histórica alerta como backfill90', async () => {
    sales.syncCompany.mockRejectedValueOnce(new SwlPermanentHttpError(403));

    await processor.processSalesImport(
      job({ data: { companyId: 'company-1', mode: 'historical' } }),
    );

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ kind: 'backfill90' }),
    );
  });
});

describe('SwlSaleProcessor', () => {
  const sales = { processAttendance: jest.fn() };
  const alert = { notify: jest.fn() };
  const processor = new SwlSaleProcessor(sales as any, alert as any);
  const atendimento = { id: 10 };

  function saleJob(overrides: Record<string, unknown> = {}) {
    return {
      data: { companyId: 'company-1', atendimento, centroNome: 'Loja Centro' },
      attemptsMade: 0,
      opts: { attempts: 3 },
      ...overrides,
    } as any;
  }

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('grava o atendimento com o centro de custo', async () => {
    await processor.processSale(saleJob());

    expect(sales.processAttendance).toHaveBeenCalledWith(
      'company-1',
      atendimento,
      { centroNome: 'Loja Centro', lastAttempt: false },
    );
  });

  it('informa a última tentativa ao serviço', async () => {
    await processor.processSale(saleJob({ attemptsMade: 2 }));

    expect(sales.processAttendance).toHaveBeenCalledWith(
      'company-1',
      atendimento,
      { centroNome: 'Loja Centro', lastAttempt: true },
    );
  });

  it('relança erro de gravação', async () => {
    sales.processAttendance.mockRejectedValueOnce(new Error('db caiu'));

    await expect(processor.processSale(saleJob())).rejects.toThrow('db caiu');
    expect(alert.notify).not.toHaveBeenCalled();
  });

  it('na última tentativa de erro alerta e relança', async () => {
    sales.processAttendance.mockRejectedValueOnce(new Error('db caiu'));

    await expect(
      processor.processSale(saleJob({ attemptsMade: 2 })),
    ).rejects.toThrow('db caiu');
    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ partner: 'swl', companyId: 'company-1' }),
    );
  });

  it('alerta quando a última tentativa grava sem cliente por falta de vínculo', async () => {
    const atendimentoComCliente = { id: 10, clienteId: 7 };
    sales.processAttendance.mockResolvedValueOnce({ customerLinkMissing: true });

    await processor.processSale(
      saleJob({
        attemptsMade: 2,
        data: {
          companyId: 'company-1',
          atendimento: atendimentoComCliente,
        },
      }),
    );

    expect(alert.notify).toHaveBeenCalledWith(
      expect.objectContaining({ partner: 'swl', companyId: 'company-1' }),
    );
  });
});
