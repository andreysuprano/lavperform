import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SchedulerOrchestrator } from '@nestjs/schedule/dist/scheduler.orchestrator';
import { CustomersProcessor } from '../../../src/customers/infrastructure/jobs/customers.processor';
import { WhatsappValidationProcessor } from '../../../src/customers/infrastructure/jobs/whatsapp-validation.processor';

describe('Customers (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let pool: Pool;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let authToken: string;
  let companyId: string;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup((builder) =>
      builder
        .overrideProvider(CustomersProcessor)
        .useValue({})
        .overrideProvider(WhatsappValidationProcessor)
        .useValue({})
        .overrideProvider(SchedulerOrchestrator)
        .useValue({
          addCron: jest.fn(),
          addInterval: jest.fn(),
          addTimeout: jest.fn(),
        }),
    );
    pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
    customerFactory = new CustomerFactory(prisma);
  });

  afterAll(async () => {
    await testApp.teardown();
    await prisma.$disconnect();
    await pool.end();
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

    it('filters customers by birth month regardless of year', async () => {
      await customerFactory.create(companyId, {
        name: 'Março antigo',
        birthDate: new Date('1980-03-10T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Março recente',
        birthDate: new Date('2000-03-20T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Abril',
        birthDate: new Date('1990-04-10T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Sem data',
        birthDate: null,
      });

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/customers?birthMonth=3&orderBy=name&orderDirection=asc`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
        'Março antigo',
        'Março recente',
      ]);
      expect(response.body.meta.total).toBe(2);
    });

    it.each([0, 13, 1.5])('rejects invalid birth month %s', async (birthMonth) => {
      await request(app.getHttpServer())
        .get(`/companies/${companyId}/customers?birthMonth=${birthMonth}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(400);
    });

    it('keeps hasBirthDate=false filtering customers without birth date', async () => {
      await customerFactory.create(companyId, {
        name: 'Com data',
        birthDate: new Date('1990-03-10T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Sem data',
        birthDate: null,
      });

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/customers?hasBirthDate=false`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items.map((item: { name: string }) => item.name)).toEqual([
        'Sem data',
      ]);
      expect(response.body.meta.total).toBe(1);
    });

    it.each([
      ['asc', ['Mais antigo', 'Mais novo', 'Sem data']],
      ['desc', ['Mais novo', 'Mais antigo', 'Sem data']],
    ] as const)('orders birth dates %s with nulls last', async (direction, expected) => {
      await customerFactory.create(companyId, {
        name: 'Mais antigo',
        birthDate: new Date('1980-01-01T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Mais novo',
        birthDate: new Date('2000-01-01T00:00:00.000Z'),
      });
      await customerFactory.create(companyId, {
        name: 'Sem data',
        birthDate: null,
      });

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/customers?orderBy=birthDate&orderDirection=${direction}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.items.map((item: { name: string }) => item.name)).toEqual(expected);
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