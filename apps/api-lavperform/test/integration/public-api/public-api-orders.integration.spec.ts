import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ApiKeyStatus, PrismaClient } from '@prisma/client';
import { createHash } from 'crypto';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { PublicApiTestApp } from '../utils/public-api-test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';

describe('Public API Orders (Integration)', () => {
  let app: INestApplication;
  let testApp: PublicApiTestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let companyId: string;
  let rawApiKey: string;

  beforeAll(async () => {
    testApp = new PublicApiTestApp();
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
    const { company } = await authHelper.createAuthenticatedUser();
    companyId = company.id;

    rawApiKey = 'fcrm_abcd1234_testsecretpart123456';
    await prisma.publicApiKey.create({
      data: {
        name: 'Test Key',
        prefix: 'abcd1234',
        hashedKey: createHash('sha256').update(rawApiKey).digest('hex'),
        status: ApiKeyStatus.ACTIVE,
        companyId,
      },
    });
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  const validPayload = {
    externalOrderId: 'integration-order-1',
    displayId: 1001,
    status: 'closed',
    orderType: 'delivery',
    orderTiming: 'instant',
    deliveryFee: 5,
    serviceFee: 0,
    additionalFee: 0,
    total: 55.9,
    customer: {
      name: 'Cliente Integração',
      phone: '41997269435',
    },
    createdAt: '2026-06-18T18:30:00.000Z',
    updatedAt: '2026-06-18T18:45:00.000Z',
  };

  it('POST /v1/orders enfileira pedido com API key válida', async () => {
    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('x-api-key', rawApiKey)
      .send(validPayload)
      .expect(202);

    expect(response.body.status).toBe('queued');
    expect(response.body.externalOrderId).toBe('integration-order-1');
  });

  it('POST /v1/orders retorna already_received para pedido duplicado', async () => {
    await prisma.order.create({
      data: {
        externalOrderId: 'integration-order-1',
        displayId: 1001,
        merchantId: 0,
        status: 'closed',
        orderType: 'delivery',
        orderTiming: 'instant',
        salesChannel: 'partner-test',
        deliveryFee: 5,
        serviceFee: 0,
        additionalFee: 0,
        total: 55.9,
        companyId,
        customerId: (
          await prisma.customer.create({
            data: {
              name: 'Existing',
              phone: '5511999999999',
              companyId,
            },
          })
        ).id,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('x-api-key', rawApiKey)
      .send(validPayload)
      .expect(200);

    expect(response.body.status).toBe('already_received');
  });

  it('POST /v1/orders retorna 401 sem API key', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .send(validPayload)
      .expect(401);
  });

  it('POST /v1/orders retorna 400 sem phone e cpf do customer', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('x-api-key', rawApiKey)
      .send({
        ...validPayload,
        customer: { name: 'Sem contato' },
      })
      .expect(400);
  });

  it('POST /v1/orders retorna 400 com partnerId inválido', async () => {
    await request(app.getHttpServer())
      .post('/v1/orders')
      .set('x-api-key', rawApiKey)
      .send({
        ...validPayload,
        partnerId: '00000000-0000-0000-0000-000000000000',
      })
      .expect(400);
  });

  it('POST /v1/orders aceita partnerId válido', async () => {
    const partner = await prisma.partner.create({
      data: {
        name: 'Partner Integração',
        partnerSlug: 'partner-integracao',
      },
    });

    const response = await request(app.getHttpServer())
      .post('/v1/orders')
      .set('x-api-key', rawApiKey)
      .send({
        ...validPayload,
        externalOrderId: 'integration-order-partner',
        partnerId: partner.id,
      })
      .expect(202);

    expect(response.body.status).toBe('queued');
  });
});
