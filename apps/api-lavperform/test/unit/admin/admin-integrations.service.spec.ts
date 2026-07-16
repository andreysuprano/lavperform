import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AdminIntegrationsService } from 'src/admin/integrations/admin-integrations.service';
import { ImportHistoryStrategyFactory } from 'src/integrations/import-history-strategy.factory';
import { CiccloSalesService } from 'src/integrations/cicclo/application/cicclo-sales.service';
import { L2AutomateSalesService } from 'src/integrations/l2automate/application/l2automate-sales.service';
import { MaxlavSalesService } from 'src/integrations/maxlav/application/maxlav-sales.service';
import { VmLavSalesService } from 'src/integrations/vmlav/application/vmlav-sales.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DigitalMenuIntegration } from 'src/partners/domain/digital-menu-integration.entity';

describe('AdminIntegrationsService', () => {
  let service: AdminIntegrationsService;

  const mockDigitalMenuIntegrationRepository = {
    findById: jest.fn(),
    findAllByCompanyId: jest.fn(),
    findByCompanyAndPartner: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  const mockPartnerRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
  };

  const mockPrisma = {
    company: {
      findUnique: jest.fn(),
    },
  };

  const mockImportStrategy = {
    execute: jest.fn(),
  };

  const mockImportHistoryStrategyFactory = {
    resolve: jest.fn(),
  };

  const mockVmLavSalesService = {
    importHistoricalSales: jest.fn(),
  };

  const mockCiccloSalesService = {
    importHistoricalSales: jest.fn(),
  };

  const mockL2AutomateSalesService = {
    importHistoricalSales: jest.fn(),
  };

  const mockMaxlavSalesService = {
    importHistoricalSales: jest.fn(),
  };

  const importResult = {
    message: 'Importação iniciada com sucesso',
    startDate: '2024-01-01',
    endDate: '2024-05-01',
    totalDays: 122,
    jobsCreated: 122,
  };

  function buildIntegration(
    overrides: Partial<DigitalMenuIntegration> & {
      partnerSlug: string;
    },
  ): DigitalMenuIntegration {
    return {
      id: 'integration-1',
      companyId: 'company-1',
      partnerId: 'partner-1',
      apiKey: 'api-key',
      apiSecret: null,
      username: null,
      password: null,
      merchantId: overrides.partnerSlug === 'CICCLO' ? 'merchant-1' : null,
      digitalMenuUrl: null,
      active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      partner: {
        id: 'partner-1',
        name: 'Partner',
        partnerSlug: overrides.partnerSlug,
        logoUrl: null,
        baseUrlWebhook: null,
        createdAt: new Date(),
      },
      ...overrides,
    } as DigitalMenuIntegration;
  }

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AdminIntegrationsService,
        {
          provide: 'IDigitalMenuIntegrationRepository',
          useValue: mockDigitalMenuIntegrationRepository,
        },
        {
          provide: 'IPartnerRepository',
          useValue: mockPartnerRepository,
        },
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ImportHistoryStrategyFactory,
          useValue: mockImportHistoryStrategyFactory,
        },
        {
          provide: VmLavSalesService,
          useValue: mockVmLavSalesService,
        },
        {
          provide: CiccloSalesService,
          useValue: mockCiccloSalesService,
        },
        {
          provide: L2AutomateSalesService,
          useValue: mockL2AutomateSalesService,
        },
        {
          provide: MaxlavSalesService,
          useValue: mockMaxlavSalesService,
        },
      ],
    }).compile();

    service = module.get(AdminIntegrationsService);
    jest.clearAllMocks();

    mockPrisma.company.findUnique.mockResolvedValue({ id: 'company-1' });
    mockImportHistoryStrategyFactory.resolve.mockReturnValue(mockImportStrategy);
    mockImportStrategy.execute.mockResolvedValue(importResult);
    mockVmLavSalesService.importHistoricalSales.mockResolvedValue(importResult);
    mockCiccloSalesService.importHistoricalSales.mockResolvedValue(importResult);
    mockL2AutomateSalesService.importHistoricalSales.mockResolvedValue(importResult);
    mockMaxlavSalesService.importHistoricalSales.mockResolvedValue(importResult);
  });

  describe('importHistory', () => {
    it('rejeita parceiro unified sem estratégia registrada', async () => {
      const integration = buildIntegration({ partnerSlug: 'UNKNOWN_UNIFIED' });
      mockDigitalMenuIntegrationRepository.findById.mockResolvedValue(integration);
      mockImportHistoryStrategyFactory.resolve.mockReturnValue(null);

      await expect(
        service.importHistory('company-1', 'integration-1', {
          startDate: '2024-01-01',
          endDate: '2024-05-01',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('roteia parceiro dedicated passando a integração validada', async () => {
      const integration = buildIntegration({ partnerSlug: 'VMLAV' });
      mockDigitalMenuIntegrationRepository.findById.mockResolvedValue(integration);

      const dto = { startDate: '2024-01-01', endDate: '2024-05-01' };
      await service.importHistory('company-1', 'integration-1', dto);

      expect(mockVmLavSalesService.importHistoricalSales).toHaveBeenCalledWith(
        'company-1',
        dto,
        integration,
      );
    });

    it('rejeita integração inativa', async () => {
      const integration = buildIntegration({
        partnerSlug: 'VMLAV',
        active: false,
      });
      mockDigitalMenuIntegrationRepository.findById.mockResolvedValue(integration);

      await expect(
        service.importHistory('company-1', 'integration-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('rejeita parceiro sem suporte a histórico', async () => {
      const integration = buildIntegration({ partnerSlug: 'CONSUMER' });
      mockDigitalMenuIntegrationRepository.findById.mockResolvedValue(integration);

      await expect(
        service.importHistory('company-1', 'integration-1', {}),
      ).rejects.toThrow(BadRequestException);
    });

    it('retorna 404 quando integração não pertence à empresa', async () => {
      mockDigitalMenuIntegrationRepository.findById.mockResolvedValue(
        buildIntegration({ partnerSlug: 'VMLAV', companyId: 'other-company' }),
      );

      await expect(
        service.importHistory('company-1', 'integration-1', {}),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
