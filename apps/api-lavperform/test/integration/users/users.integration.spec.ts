import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as bcrypt from 'bcrypt';

describe('Users (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let authToken: string;
  let userId: string;

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
    const { token, user } = await authHelper.createAuthenticatedUser();
    authToken = token;
    userId = user.id;
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /users', () => {
    it('should create a user successfully', async () => {
      const createDto = {
        name: 'New User',
        email: 'newuser@test.com',
        phone: '+5511988776655',
        password: 'NewPass123!',
      };

      const response = await request(app.getHttpServer())
        .post('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.name).toBe(createDto.name);
    });
  });

  describe('GET /users', () => {
    it('should return paginated list of users', async () => {
      const hashedPassword = await bcrypt.hash('Test123!', 10);

      await prisma.user.createMany({
        data: [
          { name: 'User 1', email: 'u1@test.com', phone: '1', password: hashedPassword },
          { name: 'User 2', email: 'u2@test.com', phone: '2', password: hashedPassword },
        ],
      });

      const response = await request(app.getHttpServer())
        .get('/users')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body).toHaveProperty('items');
      expect(response.body).toHaveProperty('meta');
    });
  });

  describe('GET /users/me', () => {
    it('should return authenticated user data', async () => {
      const response = await request(app.getHttpServer())
        .get('/users/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(userId);
    });
  });
});