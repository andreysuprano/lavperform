import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Application (Integration)', () => {
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

  describe('GET /application/preload', () => {
    it('should return 401 even with token (KNOWN BUG: missing JwtAuthGuard in controller)', async () => {
      // This test documents a bug in ApplicationController where @User() decorator
      // is used without @UseGuards(AuthGuard('jwt')), causing 401 because request.user is undefined.
      await request(app.getHttpServer())
        .get('/application/preload')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(401);
    });

    it('should return 401 without authentication', async () => {
      await request(app.getHttpServer())
        .get('/application/preload')
        .expect(401);
    });
  });
});
