import { PrismaService } from 'src/prisma/prisma.service';
import { CustomerPrismaRepository } from 'src/customers/infrastructure/persistence/prisma-customer.repository';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';

describe('getTopBuyers cycleCount (Integration)', () => {
  let prisma: PrismaService;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let repository: CustomerPrismaRepository;
  let companyId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repository = new CustomerPrismaRepository(prisma);
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
    customerFactory = new CustomerFactory(prisma);
  });

  afterAll(async () => {
    await prisma.onModuleDestroy();
  });

  beforeEach(async () => {
    const { company } = await authHelper.createAuthenticatedUser();
    companyId = company.id;
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  const baseOrderFields = (customerId: string, total: number, createdAt: Date) => ({
    displayId: Math.floor(Math.random() * 10000),
    merchantId: 1,
    status: 'COMPLETED',
    orderType: 'DELIVERY',
    orderTiming: 'IMMEDIATE',
    salesChannel: 'WHATSAPP',
    deliveryFee: 0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    createdAt,
    updatedAt: createdAt,
    companyId,
    customerId,
  });

  const mainItem = (quantity: number) => ({
    itemId: 1,
    name: 'Lavagem',
    quantity,
    unitPrice: 10,
    totalPrice: quantity * 10,
    kind: 'MAIN',
    status: 'CONFIRMED',
  });

  const childItem = (quantity: number) => ({
    itemId: 2,
    name: 'Extra',
    quantity,
    unitPrice: 1,
    totalPrice: quantity,
    kind: 'OPTION',
    status: 'CONFIRMED',
  });

  it('conta 2 ciclos e 1 venda quando o pedido tem dois itens principais', async () => {
    const customer = await customerFactory.create(companyId);
    const now = new Date();

    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 40, now),
        items: {
          create: [mainItem(1), mainItem(1)],
        },
      },
    });

    const [row] = await repository.getTopBuyers(companyId, {
      limit: 10,
      sortBy: 'orderCount',
    });

    expect(row.orderCount).toBe(1);
    expect(row.cycleCount).toBe(2);
    expect(row.totalSpent).toBe(40);
  });

  it('não soma item filho no cycleCount', async () => {
    const customer = await customerFactory.create(companyId);
    const now = new Date();

    const order = await prisma.order.create({
      data: baseOrderFields(customer.id, 20, now),
    });
    const parent = await prisma.orderItem.create({
      data: {
        orderId: order.id,
        ...mainItem(2),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: order.id,
        parentItemId: parent.id,
        ...childItem(10),
      },
    });

    const [row] = await repository.getTopBuyers(companyId, {
      limit: 10,
      sortBy: 'orderCount',
    });

    expect(row.orderCount).toBe(1);
    expect(row.cycleCount).toBe(2);
  });

  it('ordena sortBy=orderCount por cycleCount, não por número de pedidos', async () => {
    const fewerCycles = await customerFactory.create(companyId);
    const moreCycles = await customerFactory.create(companyId);
    const now = new Date();

    await prisma.order.create({
      data: {
        ...baseOrderFields(fewerCycles.id, 10, now),
        items: { create: mainItem(1) },
      },
    });
    await prisma.order.create({
      data: {
        ...baseOrderFields(fewerCycles.id, 10, now),
        items: { create: mainItem(1) },
      },
    });
    await prisma.order.create({
      data: {
        ...baseOrderFields(fewerCycles.id, 10, now),
        items: { create: mainItem(1) },
      },
    });

    await prisma.order.create({
      data: {
        ...baseOrderFields(moreCycles.id, 50, now),
        items: { create: mainItem(8) },
      },
    });

    const rows = await repository.getTopBuyers(companyId, {
      limit: 10,
      sortBy: 'orderCount',
    });

    expect(rows[0].customerId).toBe(moreCycles.id);
    expect(rows[0].cycleCount).toBe(8);
    expect(rows[0].orderCount).toBe(1);
    expect(rows[1].customerId).toBe(fewerCycles.id);
    expect(rows[1].cycleCount).toBe(3);
    expect(rows[1].orderCount).toBe(3);
  });

  it('ordena sortBy=totalSpent por valor e ainda devolve cycleCount', async () => {
    const highSpend = await customerFactory.create(companyId);
    const highCycles = await customerFactory.create(companyId);
    const now = new Date();

    await prisma.order.create({
      data: {
        ...baseOrderFields(highSpend.id, 200, now),
        items: { create: mainItem(1) },
      },
    });
    await prisma.order.create({
      data: {
        ...baseOrderFields(highCycles.id, 50, now),
        items: { create: mainItem(8) },
      },
    });

    const rows = await repository.getTopBuyers(companyId, {
      limit: 10,
      sortBy: 'totalSpent',
    });

    expect(rows[0].customerId).toBe(highSpend.id);
    expect(rows[0].totalSpent).toBe(200);
    expect(rows[0].cycleCount).toBe(1);
    expect(rows[1].customerId).toBe(highCycles.id);
    expect(rows[1].cycleCount).toBe(8);
  });
});
