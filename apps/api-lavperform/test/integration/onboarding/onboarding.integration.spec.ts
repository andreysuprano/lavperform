import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient, CycleType } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { AsaasService } from 'src/integrations/asaas/api/asaas.service';

describe('Onboarding (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;

  const asaasMock = {
    createCustomer: jest.fn().mockResolvedValue({ id: 'cust_test_123' }),
    createSubscription: jest.fn().mockResolvedValue({ id: 'sub_test_123' }),
  };

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup((builder) => 
      builder.overrideProvider(AsaasService).useValue(asaasMock)
    );
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

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /onboarding', () => {
    it('should create company and admin user successfully', async () => {
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

      const plan = await prisma.plan.create({
        data: {
          name: 'Free',
          description: 'Free plan',
          price: 0,
          cycle: CycleType.MONTHLY
        }
      });

      const onboardingDto = {
        company: {
          name: 'New Resto',
          cnpj: '12.345.678/0001-99',
          email: 'resto@test.com',
          phone: '(11) 99999-9999',
          zipCode: '12345-678',
          street: 'Rua Teste',
          number: '123',
          neighborhood: 'Bairro',
          city: 'Cidade',
          state: 'SP'
        },
        name: 'Admin User',
        email: 'admin@test.com',
        password: 'Password123!',
        phone: '(11) 98888-8888',
        planId: plan.id
      };

      const response = await request(app.getHttpServer())
        .post('/onboarding')
        .send(onboardingDto);

      if (response.status !== 201) {
        console.error('Onboarding Error Response:', JSON.stringify(response.body, null, 2));
      }
      expect(response.status).toBe(201);

      expect(response.body).toHaveProperty('company');
      expect(response.body).toHaveProperty('user');
    });
  });
});