import { Test, TestingModule } from '@nestjs/testing';
import { OrderController } from 'src/orders/presentation/order.controller';
import { OrderService } from 'src/orders/application/order.service';

describe('OrderController', () => {
    let controller: OrderController;
    let service: OrderService;

    const mockOrderService = {
        findByCompanyId: jest.fn(),
        findByCustomerId: jest.fn(),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            controllers: [OrderController],
            providers: [
                {
                    provide: OrderService,
                    useValue: mockOrderService,
                },
            ],
        }).compile();

        controller = module.get<OrderController>(OrderController);
        service = module.get<OrderService>(OrderService);

        jest.clearAllMocks();
    });

    it('should be defined', () => {
        expect(controller).toBeDefined();
    });

    describe('findAll', () => {
        it('should call service.findByCompanyId', async () => {
            const companyId = 'comp1';
            const expectedResult = { orders: [], total: 0, page: 1, limit: 10, totalPages: 0 };
            mockOrderService.findByCompanyId.mockResolvedValue(expectedResult);

            const result = await controller.findAll(companyId);

            expect(service.findByCompanyId).toHaveBeenCalledWith(companyId);
            expect(result).toEqual(expectedResult);
        });
    });

    describe('findOne', () => {
        it('should call service.findByCustomerId', async () => {
            const customerId = 'cust1';
            const expectedResult = { orders: [], total: 0, page: 1, limit: 10, totalPages: 0 };
            mockOrderService.findByCustomerId.mockResolvedValue(expectedResult);

            const result = await controller.findOne(customerId);

            expect(service.findByCustomerId).toHaveBeenCalledWith(customerId);
            expect(result).toEqual(expectedResult);
        });
    });
});
