import { Job } from 'bull';
import { VmLavSalesProcessor } from 'src/integrations/vmlav/infrastructure/jobs/vmlav-sales.processor';
import { VmLavSaleProcessor } from 'src/integrations/vmlav/infrastructure/jobs/vmlav-sale.processor';

describe('VmLav processors', () => {
  it('devolve o resultado da importação diária no job da fila', async () => {
    const vmLavSalesService = {
      processDailySales: jest.fn().mockResolvedValue({
        companyId: 'company-1',
        date: '2026-09-01',
        cnpj: '12345678000190',
        salesFound: 0,
        enqueued: 0,
      }),
    };
    const processor = new VmLavSalesProcessor(vmLavSalesService as any);

    const result = await processor.processSalesImport({
      data: { companyId: 'company-1', date: '2026-09-01' },
    } as Job<{ companyId: string; date: string }>);

    expect(result).toEqual({
      companyId: 'company-1',
      date: '2026-09-01',
      cnpj: '12345678000190',
      salesFound: 0,
      enqueued: 0,
    });
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
