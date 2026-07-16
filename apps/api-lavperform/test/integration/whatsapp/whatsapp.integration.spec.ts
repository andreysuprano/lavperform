import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, WhatsappInstanceStatus } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { WhatsappInstanceFactory } from '../fixtures/whatsapp-instance.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { EvolutionClient } from 'src/whatsapp/clients/evolution.client';

describe('WhatsApp (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let whatsappInstanceFactory: WhatsappInstanceFactory;
  let authToken: string;
  let companyId: string;

  const evolutionClientMock = {
    createInstance: jest.fn().mockResolvedValue({}),
    connectInstance: jest.fn().mockResolvedValue({
      qrcode: 'test-qr-code',
      pairingCode: 'test-pairing-code',
      code: 'test-code',
      message: 'QR Code generated'
    }),
    getConnectionState: jest.fn().mockResolvedValue({
      instance: {
        state: 'open',
        instanceName: 'test-instance'
      }
    }),
    deleteInstance: jest.fn().mockResolvedValue({}),
  };

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup((builder) => 
      builder.overrideProvider(EvolutionClient).useValue(evolutionClientMock)
    );
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
    whatsappInstanceFactory = new WhatsappInstanceFactory(prisma);
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
    jest.clearAllMocks();
  });

  describe('POST /whatsapp/companies/:companyId/instances', () => {
    it('should create a whatsapp instance successfully', async () => {
      const response = await request(app.getHttpServer())
        .post(`/whatsapp/companies/${companyId}/instances`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(201);

      expect(response.body).toHaveProperty('instanceId');
      expect(response.body).toHaveProperty('qrcode', 'test-qr-code');
      expect(response.body.status).toBe(WhatsappInstanceStatus.PENDING);

      // Verify in DB
      const instance = await prisma.whatsappInstance.findUnique({
        where: { companyId },
      });
      expect(instance).toBeDefined();
      expect(instance!.status).toBe(WhatsappInstanceStatus.PENDING);
    });

    it('should return 409 if active instance already exists', async () => {
      await whatsappInstanceFactory.create(companyId, { status: WhatsappInstanceStatus.CONNECTED });

      await request(app.getHttpServer())
        .post(`/whatsapp/companies/${companyId}/instances`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(409);
    });
  });

  describe('GET /whatsapp/companies/:companyId/instances/connection', () => {
    it('should return connection info', async () => {
      await whatsappInstanceFactory.create(companyId, { name: 'test-name', status: WhatsappInstanceStatus.PENDING });

      const response = await request(app.getHttpServer())
        .get(`/whatsapp/companies/${companyId}/instances/connection`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('qrcode', 'test-qr-code');
      expect(evolutionClientMock.connectInstance).toHaveBeenCalledWith('test-name');
    });

    it('should return status if already connected', async () => {
      await whatsappInstanceFactory.create(companyId, { status: WhatsappInstanceStatus.CONNECTED });

      const response = await request(app.getHttpServer())
        .get(`/whatsapp/companies/${companyId}/instances/connection`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe(WhatsappInstanceStatus.CONNECTED);
      expect(response.body.message).toBe('Instância já está conectada');
    });
  });

  describe('GET /whatsapp/companies/:companyId/instances/status', () => {
    it('should return instance status and update if changed', async () => {
      await whatsappInstanceFactory.create(companyId, { name: 'test-name', status: WhatsappInstanceStatus.PENDING });

      evolutionClientMock.getConnectionState.mockResolvedValueOnce({
        instance: { state: 'open', instanceName: 'test-name' }
      });

      const response = await request(app.getHttpServer())
        .get(`/whatsapp/companies/${companyId}/instances/status`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.status).toBe(WhatsappInstanceStatus.CONNECTED);

      // Verify updated in DB
      const instance = await prisma.whatsappInstance.findUnique({
        where: { companyId },
      });
      expect(instance!.status).toBe(WhatsappInstanceStatus.CONNECTED);
    });
  });

  describe('DELETE /whatsapp/companies/:companyId/instances', () => {
    it('should delete instance successfully', async () => {
      await whatsappInstanceFactory.create(companyId, { name: 'test-name' });

      await request(app.getHttpServer())
        .delete(`/whatsapp/companies/${companyId}/instances`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      const instance = await prisma.whatsappInstance.findUnique({
        where: { companyId },
      });
      expect(instance).toBeNull();
      expect(evolutionClientMock.deleteInstance).toHaveBeenCalledWith('test-name');
    });
  });
});
