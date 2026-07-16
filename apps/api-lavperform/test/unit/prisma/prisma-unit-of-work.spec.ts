import { Test, TestingModule } from '@nestjs/testing';
import { PrismaUnitOfWork } from 'src/prisma/prisma-unit-of-work';
import { PrismaService } from 'src/prisma/prisma.service';

describe('PrismaUnitOfWork', () => {
    let uow: PrismaUnitOfWork;
    let prismaService: PrismaService;

    const mockTransactionClient = {
        $executeRaw: jest.fn(),
        $queryRaw: jest.fn(),
    };

    const mockPrismaService = {
        $transaction: jest.fn((cb) => cb(mockTransactionClient)),
    };

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                PrismaUnitOfWork,
                { provide: PrismaService, useValue: mockPrismaService },
            ],
        }).compile();

        uow = await module.resolve<PrismaUnitOfWork>(PrismaUnitOfWork);
        prismaService = module.get<PrismaService>(PrismaService);

        jest.clearAllMocks();
    });

    describe('getManager', () => {
        it('should return PrismaService when no transaction is active', () => {
            const manager = uow.getManager();
            expect(manager).toBe(prismaService);
        });
    });

    describe('run', () => {
        it('should execute work inside a transaction', async () => {
            const work = jest.fn().mockResolvedValue('result');

            const result = await uow.run(work);

            expect(prismaService.$transaction).toHaveBeenCalled();
            expect(work).toHaveBeenCalled();
            expect(result).toBe('result');
        });

        it('should provide the transaction client via getManager inside run', async () => {
            let managerInside;
            await uow.run(async () => {
                managerInside = uow.getManager();
            });

            expect(managerInside).toBe(mockTransactionClient);
            expect(prismaService.$transaction).toHaveBeenCalled();
        });

        it('should reuse existing transaction if nested run is called', async () => {
            await uow.run(async () => {
                // First level
                expect(uow.getManager()).toBe(mockTransactionClient);

                await uow.run(async () => {
                    // Nested level
                    expect(uow.getManager()).toBe(mockTransactionClient);
                });
            });

            // Should only call $transaction once (for the top level)
            expect(prismaService.$transaction).toHaveBeenCalledTimes(1);
        });

        it('should reset transaction client after work completes', async () => {
            await uow.run(async () => { });
            expect(uow.getManager()).toBe(prismaService);
        });

        it('should reset transaction client even if work fails', async () => {
            const work = jest.fn().mockRejectedValue(new Error('fail'));

            await expect(uow.run(work)).rejects.toThrow('fail');
            expect(uow.getManager()).toBe(prismaService);
        });
    });
});
