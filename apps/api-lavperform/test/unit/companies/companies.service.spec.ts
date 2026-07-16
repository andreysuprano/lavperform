import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { CompaniesService } from 'src/companies/application/companies.service';
import { Test, TestingModule } from '@nestjs/testing';
import { ICompanyRepository } from 'src/companies/domain/company.repository.interface';
import { IDigitalMenuIntegrationRepository } from 'src/partners/domain/digital-menu-integration.repository.interface';
import { HttpService } from '@nestjs/axios';
import { AiAgentService } from 'src/ai-agent/application/ai-agent.service';
import { RfvEngineService } from 'src/rfv-engine/application/rfv-engine.service';
import { RenitencyService } from 'src/renitency/application/renitency.service';
import { ImportHistoryStrategyFactory } from 'src/integrations/import-history-strategy.factory';

jest.mock('src/integrations/asaas/api/asaas.service', () => {
  return {
    AsaasService: jest.fn().mockImplementation(() => {
      return {
        getSubscriptionDetails: jest.fn().mockResolvedValue({ id: 'sub1' }),
        getSubscriptionPayments: jest.fn().mockResolvedValue([{ id: 'pay1' }]),
        getPaymentBarCode: jest.fn().mockResolvedValue({ bar: 1 }),
        getPaymentPixQrCode: jest.fn().mockResolvedValue({ pix: 1 }),
        putSubscriptionBillingType: jest.fn().mockResolvedValue({}),
        putCreditCardInSubscription: jest.fn().mockResolvedValue({ ok: true }),
      };
    }),
  };
});

describe('CompaniesService', () => {
  let service: CompaniesService;
  let repository: ICompanyRepository;
  let digitalMenuIntegrationRepository: IDigitalMenuIntegrationRepository;

  const mockRepository = {
    findByCnpj: jest.fn(),
    createWithAddress: jest.fn(),
    findAllWithFilters: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
    updateState: jest.fn(),
    updateAvatar: jest.fn(),
    findWithSubscriptions: jest.fn(),
    findOpeningHours: jest.fn(),
    saveOpeningHours: jest.fn(),
    updateOpeningHours: jest.fn(),
    listCompanyUsers: jest.fn(),
  };

  const mockDigitalMenuIntegrationRepository = {
    findByCompanyId: jest.fn(),
  };

  const mockHttpService = {
    axiosRef: {
      get: jest.fn(),
      post: jest.fn(),
    },
  };

  const mockAiAgentService = {
    provisionCompany: jest.fn().mockResolvedValue(undefined),
  };

  const mockRfvEngineService = {
    createDefaultConfiguration: jest.fn().mockResolvedValue(undefined),
  };

  const mockRenitencyService = {
    createDefaultConfiguration: jest.fn().mockResolvedValue(undefined),
  };

  const mockImportStrategy = {
    execute: jest.fn().mockResolvedValue({
      message: 'ok',
      startDate: '2024-01-01',
      endDate: '2024-01-02',
      totalDays: 1,
      jobsCreated: 1,
    }),
  };

  const mockImportHistoryStrategyFactory = {
    resolve: jest.fn().mockReturnValue(mockImportStrategy),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CompaniesService,
        {
          provide: 'ICompanyRepository',
          useValue: mockRepository,
        },
        {
          provide: 'IDigitalMenuIntegrationRepository',
          useValue: mockDigitalMenuIntegrationRepository,
        },
        {
          provide: HttpService,
          useValue: mockHttpService,
        },
        {
          provide: AiAgentService,
          useValue: mockAiAgentService,
        },
        {
          provide: RfvEngineService,
          useValue: mockRfvEngineService,
        },
        {
          provide: RenitencyService,
          useValue: mockRenitencyService,
        },
        {
          provide: ImportHistoryStrategyFactory,
          useValue: mockImportHistoryStrategyFactory,
        },
      ],
    }).compile();

    service = module.get<CompaniesService>(CompaniesService);
    repository = module.get<ICompanyRepository>('ICompanyRepository');
    digitalMenuIntegrationRepository = module.get<IDigitalMenuIntegrationRepository>(
      'IDigitalMenuIntegrationRepository',
    );

    jest.clearAllMocks();
  });

  describe('create', () => {
    it('creates company using repository', async () => {
      mockRepository.findByCnpj.mockResolvedValue(null);
      mockRepository.createWithAddress.mockResolvedValue({ id: 'comp1' });

      const result = await service.create({
        name: 'Company',
        cnpj: '123',
        businessPartnerId: 'bp1',
        zipCode: '1000',
      } as any);

      expect(repository.createWithAddress).toHaveBeenCalledWith(
        expect.objectContaining({ cnpj: '123', businessPartnerId: 'bp1' }),
        expect.objectContaining({ zipCode: '1000' }),
      );
      expect(result).toEqual({ id: 'comp1' });
    });

    it('throws if cnpj exists', async () => {
      mockRepository.findByCnpj.mockResolvedValue({ id: 'existing' });

      await expect(service.create({ cnpj: '123' } as any)).rejects.toBeInstanceOf(
        BadRequestException,
      );
    });
  });

  describe('findAll', () => {
    it('returns paginated data', async () => {
      mockRepository.findAllWithFilters.mockResolvedValue({ items: [{ id: '1' }], total: 1 });

      const result = await service.findAll({ page: 1, limit: 10 } as any);

      expect(repository.findAllWithFilters).toHaveBeenCalled();
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('findOne', () => {
    it('returns company if found', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });

      const result = await service.findOne('1');
      expect(result.id).toBe('1');
    });

    it('throws NotFound if not found', async () => {
      mockRepository.findById.mockResolvedValue(null);
      await expect(service.findOne('1')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('update', () => {
    it('updates company via repository', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      mockRepository.update.mockResolvedValue({ id: '1', name: 'Updated' });

      const result = await service.update('1', { name: 'Updated' } as any);

      expect(repository.update).toHaveBeenCalledWith(
        '1',
        expect.objectContaining({ name: 'Updated' }),
      );
      expect(result.name).toBe('Updated');
    });
  });

  describe('updateCompanyState', () => {
    it('updates state via repository', async () => {
      mockRepository.updateState.mockResolvedValue({ id: '1', state: 'ACTIVE' });
      const result = await service.updateCompanyState('1', 'ACTIVE');
      expect(repository.updateState).toHaveBeenCalledWith('1', 'ACTIVE');
      expect(result.state).toBe('ACTIVE');
    });
  });

  describe('updateAvatar', () => {
    it('updates avatar via repository', async () => {
      mockRepository.findById.mockResolvedValue({ id: '1' });
      mockRepository.updateAvatar.mockResolvedValue({ id: '1', avatarUrl: 'url' });

      await service.updateAvatar('1', { avatar: 'url' } as any);
      expect(repository.updateAvatar).toHaveBeenCalledWith('1', 'url');
    });
  });

  describe('importCompanyOrdersHistory', () => {
    it('imports orders for integration using the resolved strategy', async () => {
      mockDigitalMenuIntegrationRepository.findByCompanyId.mockResolvedValue({
        companyId: '1',
        apiKey: 'key',
        partner: { partnerSlug: 'VMLAV' },
      });

      const result = await service.importCompanyOrdersHistory('1');

      expect(mockImportHistoryStrategyFactory.resolve).toHaveBeenCalledWith('VMLAV');
      expect(mockImportStrategy.execute).toHaveBeenCalled();
      expect(result.jobsCreated).toBe(1);
    });

    it('throws NotFound if no integration', async () => {
      mockDigitalMenuIntegrationRepository.findByCompanyId.mockResolvedValue(null);
      await expect(service.importCompanyOrdersHistory('1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('findSubscription', () => {
    it('returns subscription details', async () => {
      mockRepository.findWithSubscriptions.mockResolvedValue({
        id: 'c1',
        companySubscriptions: [{ subscriptionId: 'sub1' }],
      });

      const result = await service.findSubscription('c1');
      expect(result.asaas.id).toBe('sub1');
    });

    it('throws when company missing', async () => {
      mockRepository.findWithSubscriptions.mockResolvedValue(null);
      await expect(service.findSubscription('missing')).rejects.toBeInstanceOf(NotFoundException);
    });
  });

  describe('findOpeningHours', () => {
    it('delegates to repository', async () => {
      mockRepository.findOpeningHours.mockResolvedValue([]);
      await service.findOpeningHours('c1');
      expect(repository.findOpeningHours).toHaveBeenCalledWith('c1');
    });
  });

  describe('findPaymentMethodInfo', () => {
    it('throws NotFound when company is missing', async () => {
      mockRepository.findWithSubscriptions.mockResolvedValue(null);

      await expect(service.findPaymentMethodInfo('missing', 'pay1')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });

    it('throws Forbidden when plan does not allow boleto or pix', async () => {
      mockRepository.findWithSubscriptions.mockResolvedValue({
        id: 'c1',
        companySubscriptions: [
          {
            plan: { allowBoleto: false, allowPix: false },
          },
        ],
      });

      await expect(service.findPaymentMethodInfo('c1', 'pay1')).rejects.toBeInstanceOf(
        ForbiddenException,
      );
    });

    it('returns barcode and pix data according to plan flags', async () => {
      mockRepository.findWithSubscriptions.mockResolvedValue({
        id: 'c1',
        companySubscriptions: [
          {
            plan: { allowBoleto: true, allowPix: true },
          },
        ],
      });

      const result = await service.findPaymentMethodInfo('c1', 'pay1');

      expect(result).toEqual({
        barcode: { bar: 1 },
        pixQrCode: { pix: 1 },
      });
    });
  });
});
