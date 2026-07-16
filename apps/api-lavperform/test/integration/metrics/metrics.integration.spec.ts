import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CampaignFactory } from '../fixtures/campaign.factory';
import { AutomaticCampaignFactory } from '../fixtures/automatic-campaign.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

describe('Metrics (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let campaignFactory: CampaignFactory;
  let automaticCampaignFactory: AutomaticCampaignFactory;
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
    automaticCampaignFactory = new AutomaticCampaignFactory(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  beforeEach(async () => {
    const { company } = await authHelper.createAuthenticatedUser();
    companyId = company.id;
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /metrics/interaction/:token', () => {
    it('should register interaction for manual campaign message', async () => {
      const campaign = await campaignFactory.create(companyId);
      
      // Create metric record
      await prisma.campaignMetric.create({
        data: {
          campaignId: campaign.id,
          interactions: 0,
        },
      });

      // Create message
      const token = uuidv4();
      const message = await prisma.message.create({
        data: {
          companyId,
          campaignId: campaign.id,
          token,
          messageText: 'Test message',
          customerName: 'Customer',
          phone: '+5511999999999',
          customerId: 'cust_123',
          status: 'SENT',
          segmentation: 'ALL'
        },
      });

      // Setup digital menu integration
      await prisma.digitalMenuIntegration.create({
        data: {
          companyId,
          digitalMenuUrl: 'https://menu.example.com',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/metrics/interaction/${token}`)
        .expect(201);

      expect(response.body).toHaveProperty('redirectUrl', 'https://menu.example.com');

      // Verify interaction registered
      const interaction = await prisma.messageInteraction.findFirst({
        where: { messageId: message.id },
      });
      expect(interaction).toBeDefined();

      // Verify metric increment
      const metric = await prisma.campaignMetric.findFirst({
        where: { campaignId: campaign.id },
      });
      expect(metric?.interactions).toBe(1);
    });

    it('should prefer message.redirectUrl (creative link) over digital menu integration', async () => {
      const campaign = await campaignFactory.create(companyId);

      await prisma.campaignMetric.create({
        data: {
          campaignId: campaign.id,
          interactions: 0,
        },
      });

      const token = uuidv4();
      await prisma.message.create({
        data: {
          companyId,
          campaignId: campaign.id,
          token,
          messageText: 'Test message',
          customerName: 'Customer',
          phone: '+5511999999999',
          customerId: 'cust_123',
          status: 'SENT',
          segmentation: 'ALL',
          redirectUrl: 'https://promo.creative.example/landing',
        },
      });

      await prisma.digitalMenuIntegration.create({
        data: {
          companyId,
          digitalMenuUrl: 'https://menu.example.com',
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/metrics/interaction/${token}`)
        .expect(201);

      expect(response.body).toHaveProperty(
        'redirectUrl',
        'https://promo.creative.example/landing',
      );
    });

    it('should register interaction for automatic campaign message', async () => {
      const autoCampaign = await automaticCampaignFactory.create(companyId);
      
      // Create metric record
      await prisma.campaignMetric.create({
        data: {
          automaticCampaignId: autoCampaign.id,
          interactions: 0,
        },
      });

      // Create message
      const token = uuidv4();
      const message = await prisma.message.create({
        data: {
          companyId,
          automaticCampaignId: autoCampaign.id,
          token,
          messageText: 'Test message',
          customerName: 'Customer',
          phone: '+5511999999999',
          customerId: 'cust_123',
          status: 'SENT',
          segmentation: 'ALL'
        },
      });

      const response = await request(app.getHttpServer())
        .post(`/metrics/interaction/${token}`)
        .expect(201);

      // Verify interaction registered
      const interaction = await prisma.messageInteraction.findFirst({
        where: { messageId: message.id },
      });
      expect(interaction).toBeDefined();

      // Verify metric increment
      const metric = await prisma.campaignMetric.findFirst({
        where: { automaticCampaignId: autoCampaign.id },
      });
      expect(metric?.interactions).toBe(1);
    });

    it('should return default redirect if message not found', async () => {
      const response = await request(app.getHttpServer())
        .post(`/metrics/interaction/invalid-token`)
        .expect(201);

      expect(response.body).toHaveProperty('redirectUrl', 'https://www.google.com');
    });
  });
});
