import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, AutomaticCampaignType } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { AutomaticCampaignFactory } from '../fixtures/automatic-campaign.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Automatic Campaigns (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let automaticCampaignFactory: AutomaticCampaignFactory;
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
    automaticCampaignFactory = new AutomaticCampaignFactory(prisma);
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

  describe('POST /campaigns/automatic/:companyId/', () => {
    it('should create an automatic campaign successfully', async () => {
      const startDate = new Date();
      const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

      const createDto = {
        name: 'Acquisition Campaign',
        type: AutomaticCampaignType.ACQUISITION,
        segmentation: 'NEW_CUSTOMERS',
        messageText: 'Welcome to our store!',
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        daysOfWeek: ['seg', 'qua', 'sex'],
      };

      const response = await request(app.getHttpServer())
        .post(`/campaigns/automatic/${companyId}/`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
    });
  });

  describe('GET /campaigns/automatic/:companyId/', () => {
    it('should return paginated list of automatic campaigns', async () => {
      await automaticCampaignFactory.createMany(companyId, 5);

      const response = await request(app.getHttpServer())
        .get(`/campaigns/automatic/${companyId}/`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('DELETE /campaigns/automatic/:companyId/:id', () => {
    it('should soft delete an automatic campaign successfully', async () => {
      const campaign = await automaticCampaignFactory.create(companyId);

      await request(app.getHttpServer())
        .delete(`/campaigns/automatic/${companyId}/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deleted = await prisma.automaticCampaign.findUnique({
        where: { id: campaign.id },
      });
      expect(deleted!.deletedAt).not.toBeNull();
    });
  });
});