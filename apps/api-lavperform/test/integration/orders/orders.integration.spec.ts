import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Orders (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
    customerFactory = new CustomerFactory(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  beforeEach(async () => {
    const { token, company } = await authHelper.createAuthenticatedUser();
    authToken = token;
    companyId = company.id;
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  const createOrderData = (customerId: string, status: string, total: number) => ({
    displayId: Math.floor(Math.random() * 10000),
    merchantId: 1,
    status,
    orderType: 'DELIVERY',
    orderTiming: 'IMMEDIATE',
    salesChannel: 'WHATSAPP',
    deliveryFee: 5.0,
    serviceFee: 0,
    additionalFee: 0,
    total,
    createdAt: new Date(),
    updatedAt: new Date(),
    companyId,
    customerId,
  });

  describe('GET /orders', () => {
    it('should return all orders for a company', async () => {
      const customer = await customerFactory.create(companyId);

      await prisma.order.create({ data: createOrderData(customer.id, 'PENDING', 100.0) });
      await prisma.order.create({ data: createOrderData(customer.id, 'COMPLETED', 200.0) });

      const response = await request(app.getHttpServer())
        .get('/orders')
        .query({ companyId })
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBe(2);
    });
  });

  describe('GET /orders/customer/:customerId', () => {
    it('should return all orders for a customer', async () => {
      const customer = await customerFactory.create(companyId);

      await prisma.order.create({ data: createOrderData(customer.id, 'PENDING', 100.0) });
      await prisma.order.create({ data: createOrderData(customer.id, 'COMPLETED', 150.0) });
      await prisma.order.create({ data: createOrderData(customer.id, 'CANCELLED', 200.0) });

      const response = await request(app.getHttpServer())
        .get(`/orders/customer/${customer.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('orders');
      expect(Array.isArray(response.body.orders)).toBe(true);
      expect(response.body.orders.length).toBe(3);
    });
  });
});
