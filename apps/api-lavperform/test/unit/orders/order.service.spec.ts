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

  describe('findSalesSummary', () => {
    it('mapeia telefone e e-mail do cliente, inclusive nulos', async () => {
      mockOrderRepository.findByCompanyId.mockResolvedValue({
        items: [
          {
            id: 'ord-1',
            createdAt: new Date('2026-08-21T14:32:00.000Z'),
            total: 37.82,
            items: [{ name: 'Lavagem', quantity: 1, parentItemId: null }],
            customer: { name: 'Maria', phone: '41999999999', email: 'maria@ex.com' },
          },
          {
            id: 'ord-2',
            createdAt: new Date('2026-08-21T15:00:00.000Z'),
            total: 10,
            items: [{ name: 'Extra', quantity: 1, parentItemId: 'parent-1' }],
            customer: { name: 'João', phone: null, email: null },
          },
        ],
        total: 2,
      });

      const result = await service.findSalesSummary('comp1', { page: 1, limit: 10 });

      expect(result.sales[0]).toMatchObject({
        orderId: 'ord-1',
        customerName: 'Maria',
        customerPhone: '41999999999',
        customerEmail: 'maria@ex.com',
        products: [{ name: 'Lavagem', quantity: 1 }],
        total: 37.82,
      });
      expect(result.sales[1]).toMatchObject({
        orderId: 'ord-2',
        customerName: 'João',
        customerPhone: null,
        customerEmail: null,
        products: [],
      });
    });
  });
});
