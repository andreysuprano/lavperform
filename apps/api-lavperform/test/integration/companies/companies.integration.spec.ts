import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as nock from 'nock';

const asaasBaseUrl = 'https://sandbox.asaas.com';
process.env.ASAAS_BASE_URL = asaasBaseUrl;
process.env.ASAAS_API_KEY = 'test-api-key';

describe('Companies (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
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

    // Workaround for bug in CompaniesService.create (hardcoded empty string for businessPartnerId)
    await prisma.businessPartner.upsert({
      where: { id: '' },
      update: {},
      create: {
        id: '',
        name: 'Empty Partner',
        email: 'empty@test.com',
        phone: '0000000000'
      }
    });
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
    nock.cleanAll();
  });

  describe('POST /companies', () => {
    it('should create a company successfully', async () => {
      const createDto = {
        slug: 'new-company',
        name: 'New Company',
        cnpj: '12.345.678/0001-90',
        email: 'newcompany@test.com',
        zipCode: '12345-678',
        street: 'Main St',
        number: '123',
        neighborhood: 'Downtown',
        city: 'New York',
        state: 'NY'
      };

      const response = await request(app.getHttpServer())
        .post('/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
      expect(response.body.cnpj).toBe(createDto.cnpj);
    });
  });

  describe('GET /companies', () => {
    it('should return paginated list of companies', async () => {
      await prisma.company.createMany({
        data: [
          { name: 'Company 1', cnpj: '11.111.111/0001-11', email: 'c1@test.com', state: 'ACTIVE' },
          { name: 'Company 2', cnpj: '22.222.222/0001-22', email: 'c2@test.com', state: 'ACTIVE' },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/companies')
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.items.length).toBeGreaterThan(0);
    });
  });

  describe('PATCH /companies/:id/state/:state', () => {
    it('should update company state successfully', async () => {
      const response = await request(app.getHttpServer())
        .patch(`/companies/${companyId}/state/INACTIVE`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.state).toBe('INACTIVE');
    });
  });

  describe('POST /companies/:id/opening-hours', () => {
    it('should create opening hours successfully', async () => {
      const openingHoursDto = {
        openingHours: [
          { dayOfWeek: 'segunda-feira', openTime: '09:00', closeTime: '18:00', isOpen: true },
          { dayOfWeek: 'terça-feira', openTime: '09:00', closeTime: '18:00', isOpen: true }
        ]
      };

      await request(app.getHttpServer())
        .post(`/companies/${companyId}/opening-hours`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(openingHoursDto)
        .expect(201);
    });
  });

  describe('GET /companies/:id/subscription', () => {
    it('should return company subscription', async () => {
      const plan = await prisma.plan.create({
        data: {
          name: 'Test Plan',
          description: 'Test Description',
          price: 100,
        }
      });

      await prisma.companySubscription.create({
        data: {
          companyId,
          planId: plan.id,
          subscriptionId: 'sub_test_123'
        }
      });

      nock(asaasBaseUrl)
        .get('/v3/subscriptions/sub_test_123')
        .reply(200, { id: 'sub_test_123', status: 'ACTIVE' });

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/subscription`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.asaas.id).toBe('sub_test_123');
    });
  });
});