import { Test, TestingModule } from '@nestjs/testing';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { OrderService } from 'src/orders/application/order.service';
import { IOrderRepository } from 'src/orders/domain/order.repository.interface';
import { CreateOrderDto } from 'src/orders/application/dto/create-order.dto';

describe('OrderService', () => {
  let service: OrderService;
  let repository: IOrderRepository;

  const mockOrderRepository = {
    createWithRelations: jest.fn(),
    findByIntegratorOrderId: jest.fn(),
    findByCustomerId: jest.fn(),
    findByCompanyId: jest.fn(),
  };

  const mockEventEmitter = {
    emit: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: 'IOrderRepository',
          useValue: mockOrderRepository,
        },
        {
          provide: EventEmitter2,
          useValue: mockEventEmitter,
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    repository = module.get<IOrderRepository>('IOrderRepository');

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should call repository.createWithRelations', async () => {
      const dto = { companyId: '1' } as CreateOrderDto;
      const expectedOrder = { id: '1' };
      mockOrderRepository.createWithRelations.mockResolvedValue(expectedOrder);

      const result = await service.create(dto);

      expect(repository.createWithRelations).toHaveBeenCalledWith(dto);
      expect(result).toEqual(expectedOrder);
    });
  });

  describe('findByIntegratorOrderId', () => {
    it('should call repository.findByIntegratorOrderId', async () => {
      mockOrderRepository.findByIntegratorOrderId.mockResolvedValue({ id: '1' });

      const result = await service.findByIntegratorOrderId('comp1', 123);

      expect(repository.findByIntegratorOrderId).toHaveBeenCalledWith('comp1', 123);
      expect(result).toEqual({ id: '1' });
    });
  });

  describe('findByCustomerId', () => {
    it('should call repository.findByCustomerId and format result', async () => {
      mockOrderRepository.findByCustomerId.mockResolvedValue({ items: [{ id: '1' }], total: 1 });
      const filter = { page: 1, limit: 10 };

      const result = await service.findByCustomerId('cust1', filter);

      expect(repository.findByCustomerId).toHaveBeenCalledWith('cust1', filter);
      expect(result).toEqual({
        orders: [{ id: '1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });

  describe('findByCompanyId', () => {
    it('should call repository.findByCompanyId and format result', async () => {
      mockOrderRepository.findByCompanyId.mockResolvedValue({ items: [{ id: '1' }], total: 1 });
      const filter = { page: 1, limit: 10 };

      const result = await service.findByCompanyId('comp1', filter);

      expect(repository.findByCompanyId).toHaveBeenCalledWith('comp1', filter);
      expect(result).toEqual({
        orders: [{ id: '1' }],
        total: 1,
        page: 1,
        limit: 10,
        totalPages: 1,
      });
    });
  });
});
