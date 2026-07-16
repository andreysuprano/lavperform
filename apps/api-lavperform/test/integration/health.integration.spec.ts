import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from './utils/test-app';
import { DatabaseCleaner } from './utils/db-cleaner';
import { RedisCleaner } from './utils/redis-cleaner';
import Redis from 'ioredis';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Health Check (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let redis: Redis;
  let dbCleaner: DatabaseCleaner;
  let redisCleaner: RedisCleaner;

  beforeAll(async () => {
    // Initialize app
    testApp = new TestApp();
    app = await testApp.setup();

    // Initialize clients
    // Initialize clients
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    redis = new Redis({
      host: process.env.REDIS_HOST,
      port: parseInt(process.env.REDIS_PORT || '6379'),
    });

    // Initialize cleaners
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

  it('should connect to the server successfully', async () => {
    // Just a placeholder to ensure the app is running
    expect(app.getHttpServer()).toBeDefined();
  });

  it('should connect to database successfully', async () => {
    // Verify database connection by creating a record
    const company = await prisma.company.create({
      data: {
        name: 'Test Company',
        cnpj: '12.345.678/0001-90',
        email: 'test@example.com',
        state: 'ACTIVE',
      },
    });

    expect(company.id).toBeDefined();

    // Verify in database
    const found = await prisma.company.findUnique({
      where: { id: company.id },
    });

    expect(found).toBeDefined();
    expect(found?.name).toBe('Test Company');
  });

  it('should connect to Redis successfully', async () => {
    const key = 'test:key';
    const value = 'test-value';

    await redis.set(key, value);
    const retrieved = await redis.get(key);

    expect(retrieved).toBe(value);
  });
});
