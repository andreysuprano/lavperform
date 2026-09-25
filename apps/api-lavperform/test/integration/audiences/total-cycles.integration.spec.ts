import { AudienceQueryEngine } from 'src/audiences/application/audience-query.engine';
import { AudienceDefinition } from 'src/audiences/domain/audience-definition.types';
import { PrismaService } from 'src/prisma/prisma.service';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';

describe('AudienceQueryEngine total_cycles (Integration)', () => {
  let prisma: PrismaService;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let engine: AudienceQueryEngine;
  let companyId: string;
  let displayId = 1;

  beforeAll(async () => {
    prisma = new PrismaService();
    await prisma.onModuleInit();
    engine = new AudienceQueryEngine(prisma);
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
    displayId: displayId++,
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

  const september = { from: '2026-09-01', to: '2026-09-30' };
  const inSeptember = new Date(Date.UTC(2026, 8, 15, 12));
  const inAugust = new Date(Date.UTC(2026, 7, 31, 12));

  function cyclesOverTen(): AudienceDefinition {
    return {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'total_cycles',
            operator: 'gt',
            value: 10,
            period: september,
          },
        ],
      },
    } as unknown as AudienceDefinition;
  }

  it('soma dois itens principais da mesma venda como 2 ciclos', async () => {
    const customer = await customerFactory.create(companyId);
    await prisma.order.create({
      data: {
        ...baseOrderFields(customer.id, 20, inSeptember),
        items: { create: [mainItem(1), mainItem(1)] },
      },
    });

    const ids = await engine.resolveCustomerIds(companyId, {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'total_cycles',
            operator: 'eq',
            value: 2,
            period: september,
          },
        ],
      },
    } as unknown as AudienceDefinition);

    expect(ids).toEqual([customer.id]);
  });

  it('não soma item filho no total de ciclos', async () => {
    const customer = await customerFactory.create(companyId);
    const order = await prisma.order.create({
      data: baseOrderFields(customer.id, 20, inSeptember),
    });
    const parent = await prisma.orderItem.create({
      data: { orderId: order.id, ...mainItem(1) },
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, parentItemId: parent.id, ...childItem(10) },
    });

    const ids = await engine.resolveCustomerIds(companyId, {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'total_cycles',
            operator: 'eq',
            value: 1,
            period: september,
          },
        ],
      },
    } as unknown as AudienceDefinition);

    expect(ids).toEqual([customer.id]);
  });

  it('devolve todos que passaram de 10 ciclos no período, sem teto', async () => {
    const qualified: string[] = [];
    for (let index = 0; index < 11; index++) {
      const customer = await customerFactory.create(companyId);
      qualified.push(customer.id);
      await prisma.order.create({
        data: {
          ...baseOrderFields(customer.id, 110, inSeptember),
          items: { create: [mainItem(11)] },
        },
      });
    }

    const below = await customerFactory.create(companyId);
    await prisma.order.create({
      data: {
        ...baseOrderFields(below.id, 100, inSeptember),
        items: { create: [mainItem(10)] },
      },
    });

    const outside = await customerFactory.create(companyId);
    await prisma.order.create({
      data: {
        ...baseOrderFields(outside.id, 110, inAugust),
        items: { create: [mainItem(11)] },
      },
    });

    const ids = await engine.resolveCustomerIds(companyId, cyclesOverTen());

    expect(ids).toHaveLength(11);
    expect(ids.sort()).toEqual(qualified.sort());
  });

  it('igual a 0 inclui quem não tem item principal no período', async () => {
    const noOrders = await customerFactory.create(companyId);
    const parentOwner = await customerFactory.create(companyId);
    const parentOrder = await prisma.order.create({
      data: baseOrderFields(parentOwner.id, 10, inSeptember),
    });
    const parent = await prisma.orderItem.create({
      data: { orderId: parentOrder.id, ...mainItem(1) },
    });

    const onlyChild = await customerFactory.create(companyId);
    const order = await prisma.order.create({
      data: baseOrderFields(onlyChild.id, 10, inSeptember),
    });
    await prisma.orderItem.create({
      data: { orderId: order.id, parentItemId: parent.id, ...childItem(10) },
    });

    const withCycle = await customerFactory.create(companyId);
    await prisma.order.create({
      data: {
        ...baseOrderFields(withCycle.id, 10, inSeptember),
        items: { create: [mainItem(1)] },
      },
    });

    const ids = await engine.resolveCustomerIds(companyId, {
      version: 1,
      include: {
        operator: 'AND',
        rules: [
          {
            type: 'total_cycles',
            operator: 'eq',
            value: 0,
            period: september,
          },
        ],
      },
    } as unknown as AudienceDefinition);

    expect(ids.sort()).toEqual([noOrders.id, onlyChild.id].sort());
  });
});
