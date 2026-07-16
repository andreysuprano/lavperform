import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from 'src/customers/application/customers.service';
import { Queue } from 'bull';
import { getQueueToken } from '@nestjs/bull';
import { QUEUE_NAMES } from 'src/common/queue/queue.constants';
import { ICustomerRepository } from 'src/customers/domain/customer.repository.interface';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { CreateCustomerDto } from 'src/customers/application/dto/create-customer.dto';
import { ClientTypes, LEAD_SEGMENTATION } from 'src/common/utils/rfvClassification';

// Mock dependencies
const mockCustomerRepository = {
  create: jest.fn(),
  createWithAddress: jest.fn(),
  update: jest.fn(),
  updateWithAddress: jest.fn(),
  findById: jest.fn(),
  findByPhone: jest.fn(),
  findAll: jest.fn(),
  delete: jest.fn(),
  deleteWithAddress: jest.fn(),
  totalCustomersBySegmentation: jest.fn(),
  countLeadsByCompany: jest.fn(),
};

const mockQueue = {
  addBulk: jest.fn(),
  add: jest.fn(),
};

const mockWhatsappValidationQueue = {
  addBulk: jest.fn(),
  add: jest.fn(),
};

const mockDigitalMenuIntegrationRepository = {
  findByCompanyId: jest.fn(),
};

describe('CustomersService', () => {
  let service: CustomersService;
  let repository: ICustomerRepository;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        {
          provide: 'ICustomerRepository',
          useValue: mockCustomerRepository,
        },
        {
          provide: 'IDigitalMenuIntegrationRepository',
          useValue: mockDigitalMenuIntegrationRepository,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.CUSTOMERS_IMPORT),
          useValue: mockQueue,
        },
        {
          provide: getQueueToken(QUEUE_NAMES.WHATSAPP_VALIDATION),
          useValue: mockWhatsappValidationQueue,
        },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    repository = module.get<ICustomerRepository>('ICustomerRepository');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    const companyId = 'company-1';
    const createDto: CreateCustomerDto = {
      name: 'John Doe',
      phone: '5511999999999',
      address: {
        street: 'Main St',
        number: '123',
      },
      // other fields
    } as any;

    it('should create a customer with address successfully', async () => {
      mockCustomerRepository.createWithAddress.mockResolvedValue({ id: '1', ...createDto });

      const result = await service.create(companyId, createDto);

      expect(repository.createWithAddress).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '1');
    });

    it('should create a customer without address successfully', async () => {
      const { address, ...dtoWithoutAddress } = createDto;
      mockCustomerRepository.create.mockResolvedValue({ id: '1', ...dtoWithoutAddress });

      const result = await service.create(companyId, dtoWithoutAddress as any);

      expect(repository.create).toHaveBeenCalled();
      expect(result).toHaveProperty('id', '1');
    });

    it('should throw BadRequestException on duplicate phone (P2002)', async () => {
      mockCustomerRepository.createWithAddress.mockRejectedValue({ code: 'P2002' });

      await expect(service.create(companyId, createDto))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('findAll', () => {
    it('should return paginated customers', async () => {
      const companyId = '1';
      const mockResult = { items: [{ id: '1' }], total: 1 };
      mockCustomerRepository.findAll.mockResolvedValue(mockResult);

      const result = await service.findAll(companyId, { page: 1, limit: 10 });

      expect(repository.findAll).toHaveBeenCalledWith(expect.objectContaining({ companyId, page: 1 }));
      expect(result.items).toHaveLength(1);
      expect(result.meta.total).toBe(1);
    });
  });

  describe('update', () => {
    const companyId = '1';
    const customerId = 'cust-1';
    const updateDto = { name: 'New Name' };

    it('should update customer successfully', async () => {
      mockCustomerRepository.findById.mockResolvedValue({ id: customerId, companyId });
      mockCustomerRepository.update.mockResolvedValue({ id: customerId, ...updateDto });

      const result = await service.update(companyId, customerId, updateDto);

      expect(repository.update).toHaveBeenCalled();
      expect(result.name).toBe('New Name');
    });

    it('should throw NotFoundException if customer not found', async () => {
      mockCustomerRepository.findById.mockResolvedValue(null);

      await expect(service.update(companyId, customerId, updateDto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('remove', () => {
    const companyId = '1';
    const customerId = 'cust-1';

    it('should delete customer with address', async () => {
      mockCustomerRepository.findById.mockResolvedValue({ id: customerId, companyId, addressId: 'addr-1' });
      mockCustomerRepository.deleteWithAddress.mockResolvedValue({ id: customerId } as any);

      await service.remove(companyId, customerId);

      expect(repository.deleteWithAddress).toHaveBeenCalledWith(customerId, 'addr-1');
    });

    it('should delete customer without address', async () => {
      mockCustomerRepository.findById.mockResolvedValue({ id: customerId, companyId, addressId: null });
      mockCustomerRepository.delete.mockResolvedValue(undefined);

      await service.remove(companyId, customerId);

      expect(repository.delete).toHaveBeenCalledWith(customerId);
    });
  });

  describe('totalCustomersBySegmentation', () => {
    it('should return counts for all segments and leads', async () => {
      const companyId = '1';
      const mockCounts = [
        { rfvClassification: ClientTypes.Campeao, _count: { _all: 10 } }
      ];
      mockCustomerRepository.totalCustomersBySegmentation.mockResolvedValue(mockCounts);
      mockCustomerRepository.countLeadsByCompany.mockResolvedValue(5);

      const result = await service.totalCustomersBySegmentation(companyId);

      expect(result).toHaveLength(12);
      const campeao = result.find(c => c.segmentation === ClientTypes.Campeao);
      expect(campeao).toBeDefined();
      if (campeao) expect(campeao.count).toBe(10);

      const novo = result.find(c => c.segmentation === ClientTypes.Novo);
      expect(novo).toBeDefined();
      if (novo) expect(novo.count).toBe(0);

      const lead = result.find(c => c.segmentation === LEAD_SEGMENTATION);
      expect(lead).toBeDefined();
      if (lead) expect(lead.count).toBe(5);
    });
  });
});
