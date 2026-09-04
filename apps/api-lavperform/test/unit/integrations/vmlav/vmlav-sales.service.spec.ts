import { Test, TestingModule } from '@nestjs/testing';
import { getQueueToken } from '@nestjs/bull';
import { VmLavSalesService } from 'src/integrations/vmlav/application/vmlav-sales.service';
import { VmLavService } from 'src/integrations/vmlav/api/vmlav.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderIngestionService } from 'src/public-api/orders/application/order-ingestion.service';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { VmLavSale } from 'src/integrations/vmlav/api/vmlav.types';

describe('VmLavSalesService', () => {
  let service: VmLavSalesService;

  const mockPrisma = {
    company: {
      findUnique: jest.fn(),
    },
    partner: {
      findUnique: jest.fn(),
    },
  };

  const mockDigitalMenuIntegrationRepository = {
    findByCompanyAndPartner: jest.fn(),
  };

  const mockVmLavService = {
    getDailySales: jest.fn(),
  };

  const mockOrderIngestionService = {
    enqueue: jest.fn(),
  };

  const mockImportQueue = {
    add: jest.fn(),
  };

  const mockSaleQueue = {
    add: jest.fn(),
  };

  const partnerId = 'partner-vmlav';
  const companyId = 'company-1';
  const apiKey = 'api-key-1';
  const date = '2026-09-04';

  const sale2 = { idVenda: 456, nomeCliente: 'Cliente 2' } as VmLavSale;

  const sale = { idVenda: 123, nomeCliente: 'Cliente Teste' } as VmLavSale;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        VmLavSalesService,
        { provide: VmLavService, useValue: mockVmLavService },
        { provide: PrismaService, useValue: mockPrisma },
        {
          provide: 'IDigitalMenuIntegrationRepository',
          useValue: mockDigitalMenuIntegrationRepository,
        },
        {
          provide: OrderIngestionService,
          useValue: mockOrderIngestionService,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.VMLAV_SALES_IMPORT),
          useValue: mockImportQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.VMLAV_SALE_PROCESS),
          useValue: mockSaleQueue,
        },
      ],
    }).compile();

    service = module.get(VmLavSalesService);
    jest.clearAllMocks();

    mockPrisma.company.findUnique.mockResolvedValue({
      id: companyId,
      cnpj: '12345678000199',
    });
    mockPrisma.partner.findUnique.mockResolvedValue({
      id: partnerId,
      partnerSlug: 'VMLAV',
    });
    mockDigitalMenuIntegrationRepository.findByCompanyAndPartner.mockResolvedValue(
      { apiKey },
    );
    mockVmLavService.getDailySales.mockResolvedValue([sale]);
    mockSaleQueue.add.mockResolvedValue({ id: 'sale-job-1' });
    mockImportQueue.add.mockResolvedValue({ id: 'import-job-1' });
  });

  it('enfileira venda com jobId estável por empresa e idVenda', async () => {
    await service.processDailySales(companyId, date);

    expect(mockSaleQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.VMLAV_SALE_PROCESS,
      expect.objectContaining({ companyId }),
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
    mockVmLavService.getDailySales.mockResolvedValue([sale, sale2]);
    mockSaleQueue.add
      .mockRejectedValueOnce(new Error('Job already exists'))
      .mockResolvedValueOnce({ id: 'sale-job-2' });

    await service.processDailySales(companyId, date);

    expect(mockSaleQueue.add).toHaveBeenCalledTimes(2);
    expect(mockSaleQueue.add).toHaveBeenLastCalledWith(
      QUEUE_NAMES.VMLAV_SALE_PROCESS,
      expect.objectContaining({ companyId, sale: sale2 }),
      expect.objectContaining({
        jobId: 'vmlav-sale:company-1:456',
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });

  it('enfileira importação histórica com jobId estável por empresa e data', async () => {
    await service.importHistoricalSales(companyId, {
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(mockImportQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      { companyId, date: '2026-09-01' },
      expect.objectContaining({
        jobId: 'vmlav-import:company-1:2026-09-01',
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );

    expect(mockImportQueue.add).toHaveBeenCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      { companyId, date: '2026-09-02' },
      expect.objectContaining({
        jobId: 'vmlav-import:company-1:2026-09-02',
      }),
    );
    expect(mockImportQueue.add).toHaveBeenCalledTimes(2);
  });

  it('continua importação histórica quando job ativo já existe', async () => {
    mockImportQueue.add
      .mockRejectedValueOnce(new Error('Job already exists'))
      .mockResolvedValueOnce({ id: 'import-job-2' });

    await service.importHistoricalSales(companyId, {
      startDate: '2026-09-01',
      endDate: '2026-09-02',
    });

    expect(mockImportQueue.add).toHaveBeenCalledTimes(2);
    expect(mockImportQueue.add).toHaveBeenLastCalledWith(
      QUEUE_NAMES.VMLAV_SALES_IMPORT,
      { companyId, date: '2026-09-02' },
      expect.objectContaining({
        jobId: 'vmlav-import:company-1:2026-09-02',
        removeOnComplete: true,
        removeOnFail: true,
      }),
    );
  });
});
