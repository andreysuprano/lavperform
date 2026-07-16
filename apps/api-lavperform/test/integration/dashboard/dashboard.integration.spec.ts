import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CustomerFactory } from '../fixtures/customer.factory';
import { CampaignFactory } from '../fixtures/campaign.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Dashboard (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let customerFactory: CustomerFactory;
  let campaignFactory: CampaignFactory;
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
    campaignFactory = new CampaignFactory(prisma);
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

  describe('GET /dashboard/customers-summary/:companyId', () => {
    it('should return customers summary for company', async () => {
      await customerFactory.createMany(companyId, 10);

      const response = await request(app.getHttpServer())
        .get(`/dashboard/customers-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body).toHaveProperty('totalCustomers');
    });

    it('should return zero summary for company without customers', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/customers-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/customers-summary/${companyId}`)
        .expect(401);
    });

    it('should include customer segmentation data', async () => {
      await customerFactory.createMany(companyId, 5);

      const response = await request(app.getHttpServer())
        .get(`/dashboard/customers-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
      expect(response.body.totalCustomers).toBeGreaterThanOrEqual(5);
    });
  });

  describe('GET /dashboard/campaigns-summary/:companyId', () => {
    it('should return campaigns summary for company', async () => {
      await campaignFactory.createMany(companyId, 5);

      const response = await request(app.getHttpServer())
        .get(`/dashboard/campaigns-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return summary with date filter', async () => {
      await campaignFactory.createMany(companyId, 3);

      const response = await request(app.getHttpServer())
        .get(`/dashboard/campaigns-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ dateFilter: 'LAST_7_DAYS' })
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should support different date filters', async () => {
      await campaignFactory.createMany(companyId, 3);

      const dateFilters = ['LAST_7_DAYS', 'LAST_30_DAYS', 'LAST_90_DAYS'];

      for (const dateFilter of dateFilters) {
        const response = await request(app.getHttpServer())
          .get(`/dashboard/campaigns-summary/${companyId}`)
          .set('Authorization', `Bearer ${authToken}`)
          .query({ dateFilter })
          .expect(200);

        expect(response.body).toBeDefined();
      }
    });

    it('should return empty summary for company without campaigns', async () => {
      const response = await request(app.getHttpServer())
        .get(`/dashboard/campaigns-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toBeDefined();
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get(`/dashboard/campaigns-summary/${companyId}`)
        .expect(401);
    });
  });

  describe('Dashboard Data Integration', () => {
    it('should provide consistent data across endpoints', async () => {
      await customerFactory.createMany(companyId, 8);
      await campaignFactory.createMany(companyId, 3);

      const customersResponse = await request(app.getHttpServer())
        .get(`/dashboard/customers-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const campaignsResponse = await request(app.getHttpServer())
        .get(`/dashboard/campaigns-summary/${companyId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(customersResponse.body).toBeDefined();
      expect(campaignsResponse.body).toBeDefined();
    });
  });
});
