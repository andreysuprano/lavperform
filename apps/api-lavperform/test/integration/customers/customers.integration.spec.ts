import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Customers (Integration)', () => {
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

  describe('POST /companies/:companyId/customers', () => {
    it('should create a customer successfully', async () => {
      const createDto = {
        name: 'John Doe',
        phone: '+5511987654321',
        email: 'john@example.com',
      };

      const response = await request(app.getHttpServer())
        .post(`/companies/${companyId}/customers`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      // Service removes the '+'
      expect(response.body.phone).toBe(createDto.phone.replace('+', ''));
    });
  });

  describe('GET /companies/:companyId/customers', () => {
    it('should return paginated list of customers', async () => {
      await customerFactory.createMany(companyId, 5);

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/customers`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('POST /companies/:companyId/customers/import', () => {
    it('should import multiple customers', async () => {
      const customersToImport = [
        { name: 'Customer 1', phone: '+5511911111111' },
        { name: 'Customer 2', phone: '+5511922222222' }
      ];

      await request(app.getHttpServer())
        .post(`/companies/${companyId}/customers/import`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(customersToImport)
        .expect(201);
    });
  });
});