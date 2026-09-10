import { VmLavSalesService } from 'src/integrations/vmlav/application/vmlav-sales.service';
import { VmLavSale } from 'src/integrations/vmlav/api/vmlav.types';
import { VMLAV_PARTNER_SLUG } from 'src/integrations/vmlav/vmlav.constants';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';

function buildSale(overrides: Partial<VmLavSale> = {}): VmLavSale {
  return {
    data: '2026-02-01T10:30:00Z',
    empresa: 'Seld Catanduva',
    documentoEmpresa: { tipo: 'CNPJ', identificador: '12345678000190' },
    idLavanderia: 10,
    idCliente: 0,
    lavanderia: 'Seld Catanduva',
    cpfCliente: '',
    nomeCliente: '',
    telefoneCliente: null,
    emailCliente: '',
    equipamento: 'M1',
    tipoPagamento: 'CARTAO',
    status: 'SUCESSO',
    codErro: '',
    erro: null,
    autorizador: null,
    provedor: 'VM',
    adquirente: 'CIELO',
    voucher: null,
    cupom: null,
    valor: 15,
    valorSemDesconto: 15,
    ciclos: 1,
    tipoCartao: 'DEBITO',
    bandeiraCartao: 'VISA',
    pedido: { itens: [] },
    dtaNascimento: '',
    requisicao: '',
    codigoAutorizacaoEmissor: '123',
    nomeCategoriaVoucher: null,
    idVenda: 9001,
    creditoReal: false,
    ...overrides,
  };
}

describe('VmLavSalesService', () => {
  const vmLavService = {
    getDailySales: jest.fn(),
    getCustomerByCpf: jest.fn(),
  };
  const prisma = {
    company: { findUnique: jest.fn() },
    partner: { findUnique: jest.fn() },
  };
  const digitalMenuIntegrationRepository = {
    findByCompanyAndPartner: jest.fn(),
  };
  const orderIngestionService = {
    enqueue: jest.fn(),
  };
  const vmLavSalesQueue = { add: jest.fn() };
  const vmLavSaleProcessQueue = { add: jest.fn() };

  let service: VmLavSalesService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new VmLavSalesService(
      vmLavService as any,
      prisma as any,
      digitalMenuIntegrationRepository as any,
      orderIngestionService as any,
      vmLavSalesQueue as any,
      vmLavSaleProcessQueue as any,
    );
  });

  describe('processSale', () => {
    it('enfileira venda self-service sem nome em vez de concluir o job sem gravar', async () => {
      orderIngestionService.enqueue.mockResolvedValue({ status: 'queued' });

      const result = await service.processSale(
        'company-1',
        buildSale({ nomeCliente: '' }),
        'api-key',
        'partner-1',
      );

      expect(orderIngestionService.enqueue).toHaveBeenCalled();
      expect(result).toEqual(
        expect.objectContaining({
          status: 'queued',
          saleId: 9001,
        }),
      );
    });
  });

  describe('processDailySales', () => {
    it('falha o job quando a empresa não tem CNPJ, em vez de marcar como concluído', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );

      await expect(
        service.processDailySales('company-1', '2026-09-01'),
      ).rejects.toThrow(/CNPJ/);
      expect(vmLavService.getDailySales).not.toHaveBeenCalled();
    });

    it('devolve quantas vendas a API retornou para o resultado aparecer na fila', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '12.345.678/0001-90',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );
      vmLavService.getDailySales.mockResolvedValue([]);

      const result = await service.processDailySales('company-1', '2026-09-01');

      expect(vmLavService.getDailySales).toHaveBeenCalledWith(
        'api-key',
        '12345678000190',
        '2026-09-01',
      );
      expect(result).toEqual({
        companyId: 'company-1',
        date: '2026-09-01',
        cnpj: '12345678000190',
        salesFound: 0,
        enqueued: 0,
      });
      expect(vmLavSaleProcessQueue.add).not.toHaveBeenCalled();
    });

    it('enfileira venda com jobId estável por empresa e idVenda', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '12345678000199',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );
      const sale = buildSale({ idVenda: 123, nomeCliente: 'Cliente Teste' });
      vmLavService.getDailySales.mockResolvedValue([sale]);
      vmLavSaleProcessQueue.add.mockResolvedValue({ id: 'sale-job-1' });

      await service.processDailySales('company-1', '2026-09-04');

      expect(vmLavSaleProcessQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.VMLAV_SALE_PROCESS,
        expect.objectContaining({ companyId: 'company-1' }),
        expect.objectContaining({
          jobId: 'vmlav-sale:company-1:123',
          attempts: 3,
          backoff: { type: 'exponential', delay: 2000 },
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });

    it('continua enfileirando próxima venda quando job ativo já existe', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '12345678000199',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );
      const sale = buildSale({ idVenda: 123, nomeCliente: 'Cliente Teste' });
      const sale2 = buildSale({ idVenda: 456, nomeCliente: 'Cliente 2' });
      vmLavService.getDailySales.mockResolvedValue([sale, sale2]);
      vmLavSaleProcessQueue.add
        .mockRejectedValueOnce(new Error('Job already exists'))
        .mockResolvedValueOnce({ id: 'sale-job-2' });

      await service.processDailySales('company-1', '2026-09-04');

      expect(vmLavSaleProcessQueue.add).toHaveBeenCalledTimes(2);
      expect(vmLavSaleProcessQueue.add).toHaveBeenLastCalledWith(
        QUEUE_NAMES.VMLAV_SALE_PROCESS,
        expect.objectContaining({ companyId: 'company-1', sale: sale2 }),
        expect.objectContaining({
          jobId: 'vmlav-sale:company-1:456',
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });
  });

  describe('importHistoricalSales', () => {
    it('enfileira importação histórica com jobId estável por empresa e data', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '12345678000199',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );
      vmLavSalesQueue.add.mockResolvedValue({ id: 'import-job-1' });

      await service.importHistoricalSales('company-1', {
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      });

      expect(vmLavSalesQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.VMLAV_SALES_IMPORT,
        { companyId: 'company-1', date: '2026-09-01' },
        expect.objectContaining({
          jobId: 'vmlav-import:company-1:2026-09-01',
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );

      expect(vmLavSalesQueue.add).toHaveBeenCalledWith(
        QUEUE_NAMES.VMLAV_SALES_IMPORT,
        { companyId: 'company-1', date: '2026-09-02' },
        expect.objectContaining({
          jobId: 'vmlav-import:company-1:2026-09-02',
        }),
      );
      expect(vmLavSalesQueue.add).toHaveBeenCalledTimes(2);
    });

    it('continua importação histórica quando job ativo já existe', async () => {
      prisma.company.findUnique.mockResolvedValue({
        id: 'company-1',
        cnpj: '12345678000199',
      });
      prisma.partner.findUnique.mockResolvedValue({
        id: 'partner-1',
        partnerSlug: VMLAV_PARTNER_SLUG,
      });
      digitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
        { apiKey: 'api-key' },
      );
      vmLavSalesQueue.add
        .mockRejectedValueOnce(new Error('Job already exists'))
        .mockResolvedValueOnce({ id: 'import-job-2' });

      await service.importHistoricalSales('company-1', {
        startDate: '2026-09-01',
        endDate: '2026-09-02',
      });

      expect(vmLavSalesQueue.add).toHaveBeenCalledTimes(2);
      expect(vmLavSalesQueue.add).toHaveBeenLastCalledWith(
        QUEUE_NAMES.VMLAV_SALES_IMPORT,
        { companyId: 'company-1', date: '2026-09-02' },
        expect.objectContaining({
          jobId: 'vmlav-import:company-1:2026-09-02',
          removeOnComplete: true,
          removeOnFail: true,
        }),
      );
    });
  });
});
