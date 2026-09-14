import { CustomerPrismaRepository } from 'src/customers/infrastructure/persistence/prisma-customer.repository';

describe('CustomerPrismaRepository', () => {
  const prisma = {
    customer: {
      findFirst: jest.fn(),
      findMany: jest.fn(),
    },
    order: {
      groupBy: jest.fn().mockResolvedValue([]),
    },
    $queryRaw: jest.fn().mockResolvedValue([]),
  };
  const repository = new CustomerPrismaRepository(prisma as any);

  const older = {
    id: 'cust-old',
    name: 'Ana Antiga',
    phone: '5541997269435',
    email: null,
    cpf: '12345678900',
    birthDate: null,
    firstOrderDate: null,
    lastOrderDate: null,
    bestOrderDay: null,
    bestOrderHour: null,
    lastContactDate: null,
    rfvClassification: null,
    gender: null,
    observations: null,
    whatsappOptin: false,
    whatsappVerified: false,
    whatsappVerifiedAt: null,
    averageTicket: null,
    companyId: 'company-1',
    addressId: null,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    address: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.order.groupBy.mockResolvedValue([]);
    prisma.customer.findFirst.mockResolvedValue(older);
    prisma.customer.findMany.mockResolvedValue([]);
    prisma.$queryRaw.mockResolvedValue([]);
  });

  describe('getTopBuyers', () => {
    const fewerCyclesCustomer = {
      id: 'cust-orders',
      name: 'Muitas vendas',
      phone: null,
      email: null,
      rfvClassification: null,
      companyId: 'company-1',
      whatsappOptin: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      birthDate: null,
    };
    const moreCyclesCustomer = {
      ...fewerCyclesCustomer,
      id: 'cust-cycles',
      name: 'Muitos ciclos',
    };

    it('retorna cycleCount e orderCount; um pedido com 2 ciclos permanece 1 venda', async () => {
      prisma.order.groupBy.mockResolvedValue([
        {
          customerId: 'cust-cycles',
          _count: { _all: 1 },
          _sum: { total: 40 },
          _max: { createdAt: new Date('2026-09-01') },
        },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { customerId: 'cust-cycles', cycle_count: 2 },
      ]);
      prisma.customer.findMany.mockResolvedValue([moreCyclesCustomer]);

      const [row] = await repository.getTopBuyers('company-1', {
        limit: 10,
        sortBy: 'orderCount',
      });

      expect(row.orderCount).toBe(1);
      expect(row.cycleCount).toBe(2);
      expect(row.totalSpent).toBe(40);
    });

    it('ordena sortBy=orderCount por cycleCount, não por número de pedidos', async () => {
      prisma.order.groupBy.mockResolvedValue([
        {
          customerId: 'cust-orders',
          _count: { _all: 3 },
          _sum: { total: 30 },
          _max: { createdAt: new Date('2026-09-01') },
        },
        {
          customerId: 'cust-cycles',
          _count: { _all: 1 },
          _sum: { total: 50 },
          _max: { createdAt: new Date('2026-09-01') },
        },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { customerId: 'cust-orders', cycle_count: 3 },
        { customerId: 'cust-cycles', cycle_count: 8 },
      ]);
      prisma.customer.findMany.mockResolvedValue([
        fewerCyclesCustomer,
        moreCyclesCustomer,
      ]);

      const rows = await repository.getTopBuyers('company-1', {
        limit: 10,
        sortBy: 'orderCount',
      });

      expect(rows.map((row) => row.customerId)).toEqual([
        'cust-cycles',
        'cust-orders',
      ]);
      expect(rows[0].cycleCount).toBe(8);
      expect(rows[1].orderCount).toBe(3);
    });

    it('ordena sortBy=totalSpent por valor e ainda devolve cycleCount', async () => {
      prisma.order.groupBy.mockResolvedValue([
        {
          customerId: 'cust-orders',
          _count: { _all: 1 },
          _sum: { total: 200 },
          _max: { createdAt: new Date('2026-09-01') },
        },
        {
          customerId: 'cust-cycles',
          _count: { _all: 1 },
          _sum: { total: 50 },
          _max: { createdAt: new Date('2026-09-01') },
        },
      ]);
      prisma.$queryRaw.mockResolvedValue([
        { customerId: 'cust-orders', cycle_count: 1 },
        { customerId: 'cust-cycles', cycle_count: 8 },
      ]);
      prisma.customer.findMany.mockResolvedValue([
        fewerCyclesCustomer,
        moreCyclesCustomer,
      ]);

      const rows = await repository.getTopBuyers('company-1', {
        limit: 10,
        sortBy: 'totalSpent',
      });

      expect(rows[0].customerId).toBe('cust-orders');
      expect(rows[0].cycleCount).toBe(1);
      expect(rows[1].cycleCount).toBe(8);
    });

    it('usa cycleCount 0 quando não há item principal', async () => {
      prisma.order.groupBy.mockResolvedValue([
        {
          customerId: 'cust-cycles',
          _count: { _all: 1 },
          _sum: { total: 15 },
          _max: { createdAt: new Date('2026-09-01') },
        },
      ]);
      prisma.$queryRaw.mockResolvedValue([]);
      prisma.customer.findMany.mockResolvedValue([moreCyclesCustomer]);

      const [row] = await repository.getTopBuyers('company-1', {
        limit: 10,
        sortBy: 'orderCount',
      });

      expect(row.orderCount).toBe(1);
      expect(row.cycleCount).toBe(0);
    });
  });

  it('findByPhone escolhe o cliente mais antigo por createdAt ASC, id ASC', async () => {
    const result = await repository.findByPhone('company-1', '5541997269435');

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', phone: '5541997269435' },
        include: { address: true },
      }),
    );
    expect(result?.id).toBe('cust-old');
  });

  it('findByCpf escolhe o cliente mais antigo por createdAt ASC, id ASC', async () => {
    const result = await repository.findByCpf('company-1', '12345678900');

    expect(prisma.customer.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { companyId: 'company-1', cpf: '12345678900' },
        include: { address: true },
      }),
    );
    expect(result?.id).toBe('cust-old');
  });
});
