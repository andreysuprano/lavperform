import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Auth - Login (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;

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

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /auth/login', () => {
    it('should login successfully with valid credentials', async () => {
      // Setup: Create user with known password
      const password = 'Test123!';
      const hashedPassword = await bcrypt.hash(password, 10);

      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          cnpj: '12.345.678/0001-90',
          email: 'company@test.com',
          state: 'ACTIVE',
        },
      });

      const user = await prisma.user.create({
        data: {
          email: 'user@test.com',
          name: 'Test User',
          phone: '+5511999999999',
          password: hashedPassword,
          userCompanies: {
            create: {
              companyId: company.id,
            },
          },
        },
      });

      // Act: Login
      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: 'user@test.com',
          password: password,
        })
        .expect(200);

      // Assert
      expect(response.body).toHaveProperty('access_token');
    });

    it('should return 401 with invalid credentials', async () => {
      const { user } = await authHelper.createAuthenticatedUser();

      const response = await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          email: user.email,
          password: 'WrongPassword123!',
        })
        .expect(401);

      expect(response.body).toHaveProperty('message');
    });

    it('should return 400 with missing email', async () => {
      await request(app.getHttpServer())
        .post('/auth/login')
        .send({
          password: 'Test123!',
        })
        .expect(400);
    });
  });
});
