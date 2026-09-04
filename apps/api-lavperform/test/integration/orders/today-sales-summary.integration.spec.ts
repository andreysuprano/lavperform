import { PrismaService } from 'src/prisma/prisma.service';
import { OrderPrismaRepository } from 'src/orders/infrastructure/persistence/prisma-order.repository';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';

describe('Today sales summary (Integration)', () => {
  let prisma: PrismaService;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let repository: OrderPrismaRepository;
  let companyId: string;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    repository = new OrderPrismaRepository(prisma);
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

  it('agrega count, totalValue e cycleCount apenas de pedidos de hoje com itens principais', async () => {
    const customer = await customerFactory.create(companyId);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    const orderWithChild = await prisma.order.create({
      data: baseOrderFields(customer.id, 20, today),
    });
    const parentItem = await prisma.orderItem.create({
      data: {
        orderId: orderWithChild.id,
        ...mainItem(2),
      },
    });
    await prisma.orderItem.create({
      data: {
        orderId: orderWithChild.id,
        parentItemId: parentItem.id,
        ...childItem(10),
      },
    });

    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 30, today),
        items: {
          create: mainItem(3),
        },
      },
    });

    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 100, yesterday),
        items: {
          create: mainItem(99),
        },
      },
    });

    expect(await repository.getTodaySales(companyId)).toEqual({
      count: 2,
      totalValue: 50,
      cycleCount: 5,
    });
  });

  it('incrementa count mas não cycleCount para pedido sem item principal', async () => {
    const customer = await customerFactory.create(companyId);
    const today = new Date();

    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 20, today),
        items: {
          create: mainItem(2),
        },
      },
    });

    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 30, today),
        items: {
          create: mainItem(3),
        },
      },
    });

    await prisma.order.create({
      data: baseOrderFields(customer.id, 15, today),
    });

    const summary = await repository.getTodaySales(companyId);

    expect(summary.count).toBe(3);
    expect(summary.cycleCount).toBe(5);
  });
});
