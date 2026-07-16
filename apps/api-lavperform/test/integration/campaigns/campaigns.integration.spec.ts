import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, CampaignStatus } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CampaignFactory } from '../fixtures/campaign.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Campaigns (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
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

  describe('POST /companies/:companyId/campaigns', () => {
    it('should create a campaign successfully', async () => {
      const scheduledDate = new Date();
      scheduledDate.setDate(scheduledDate.getDate() + 7);

      const createDto = {
        name: 'Black Friday Campaign',
        scheduledDate: scheduledDate.toISOString(),
        messageText: 'Special discount just for you!',
        segmentation: 'ALL',
        imageUrl: 'https://example.com/image.jpg',
      };

      const response = await request(app.getHttpServer())
        .post(`/companies/${companyId}/campaigns`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
    });
  });

  describe('GET /companies/:companyId/campaigns', () => {
    it('should return paginated list of campaigns', async () => {
      await campaignFactory.createMany(companyId, 5);

      const response = await request(app.getHttpServer())
        .get(`/companies/${companyId}/campaigns`)
        .set('Authorization', `Bearer ${authToken}`)
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('PATCH /companies/:companyId/campaigns/:id', () => {
    it('should update a campaign successfully', async () => {
      const campaign = await campaignFactory.create(companyId);
      const updateDto = {
        name: 'Updated Campaign Name',
        messageText: 'Updated message text',
        scheduledDate: new Date().toISOString(),
      };

      const response = await request(app.getHttpServer())
        .patch(`/companies/${companyId}/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.name).toBe(updateDto.name);
    });
  });

  describe('DELETE /companies/:companyId/campaigns/:id', () => {
    it('should delete a campaign successfully', async () => {
      const campaign = await campaignFactory.create(companyId);

      await request(app.getHttpServer())
        .delete(`/companies/${companyId}/campaigns/${campaign.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const deleted = await prisma.campaign.findUnique({
        where: { id: campaign.id },
      });
      expect(deleted).toBeNull();
    });
  });
});