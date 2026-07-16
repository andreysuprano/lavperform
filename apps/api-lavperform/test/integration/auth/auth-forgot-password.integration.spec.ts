import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { RedisCleaner } from '../utils/redis-cleaner';
import Redis from 'ioredis';
import * as bcrypt from 'bcrypt';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

// Mock Smtp to avoid connection errors
jest.mock('src/common/smtp/smtp', () => {
  return {
    Smtp: jest.fn().mockImplementation(() => {
      return {
        sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
      };
    }),
  };
});

describe('Auth - Forgot Password (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let redis: Redis;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisCleaner;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });
    dbCleaner = new DatabaseCleaner(prisma);
    redisCleaner = new RedisCleaner(redis);
  });

  afterAll(async () => {
    await redis.quit();
    await prisma.$disconnect();
    await testApp.teardown();
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
    await redisCleaner.cleanAll();
  });

  describe('POST /auth/forgot-password', () => {
    it('should return 200 for valid email', async () => {
      const hashedPassword = await bcrypt.hash('Test123!', 10);

      const company = await prisma.company.create({
        data: {
          name: 'Test Company',
          cnpj: '12.345.678/0001-90',
          email: 'company@test.com',
          state: 'ACTIVE',
        },
      });

      await prisma.user.create({
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

      await request(app.getHttpServer())
        .post('/auth/forgot-password')
        .send({
          email: 'user@test.com',
        })
        .expect(200); // AuthService.forgotPassword returns void, NestJS default for POST is 201
    });
  });

  describe('POST /auth/confirm-code', () => {
    it('should confirm valid recovery code', async () => {
      const hashedPassword = await bcrypt.hash('OldPassword123!', 10);

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

      const confirmationCode = await prisma.confirmationCode.create({
        data: {
          code: '12345',
          userId: user.id,
        },
      });

      await request(app.getHttpServer())
        .post('/auth/confirm-code')
        .send({
          code: '12345',
          password: 'NewPassword123!',
        })
        .expect(200);

      const updatedUser = await prisma.user.findUnique({
        where: { id: user.id },
      });
      const match = await bcrypt.compare('NewPassword123!', updatedUser!.password);
      expect(match).toBe(true);
    });
  });
});