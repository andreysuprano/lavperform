import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Custom Send Lists (Integration)', () => {
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

  it('creates list and campaign with CUSTOMER_LIST targeting', async () => {
    const customer = await prisma.customer.create({
      data: {
        name: 'Cliente Teste',
        phone: '5511999999999',
        companyId,
        whatsappOptin: true,
        whatsappVerified: true,
      },
    });

    const listResponse = await request(app.getHttpServer())
      .post(`/companies/${companyId}/custom-send-lists`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Lista VIP',
        customerIds: [customer.id],
      })
      .expect(201);

    expect(listResponse.body.memberCount).toBe(1);

    const scheduledDate = new Date();
    scheduledDate.setDate(scheduledDate.getDate() + 1);

    const campaignResponse = await request(app.getHttpServer())
      .post(`/companies/${companyId}/campaigns`)
      .set('Authorization', `Bearer ${authToken}`)
      .send({
        name: 'Disparo lista',
        scheduledDate: scheduledDate.toISOString(),
        messageText: 'Olá!',
        targetingMode: 'CUSTOMER_LIST',
        customSendListId: listResponse.body.id,
      })
      .expect(201);

    expect(campaignResponse.body.targetingMode).toBe('CUSTOMER_LIST');
    expect(campaignResponse.body.customSendListId).toBe(listResponse.body.id);
  });
});
