import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Link Page (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let authToken: string;
  let companyId: string;
  let companySlug: string;

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
    companySlug = company.name.toLowerCase().replace(/\s+/g, '-');

    await prisma.company.update({
      where: { id: companyId },
      data: { slug: companySlug },
    });
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('GET /link-page/:slug', () => {
    it('should return link page data by slug', async () => {
      await prisma.linkPage.create({
        data: {
          companyId,
          biography: 'Best food in town',
          bgColor: '#FFFFFF',
        },
      });

      const response = await request(app.getHttpServer())
        .get(`/link-page/${companySlug}`)
        .expect(200);

      expect(response.body.linkPages[0]).toHaveProperty('biography');
      expect(response.body.linkPages[0].biography).toBe('Best food in town');
    });

    it('should return link page with links', async () => {
      const linkPage = await prisma.linkPage.create({
        data: {
          companyId,
          biography: 'Best food in town',
          bgColor: '#FFFFFF',
        },
      });

      await prisma.link.createMany({
        data: [
          {
            linkPageId: linkPage.id,
            label: 'Menu',
            url: 'https://example.com/menu',
          },
          {
            linkPageId: linkPage.id,
            label: 'Instagram',
            url: 'https://instagram.com/restaurant',
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/link-page/${companySlug}`)
        .expect(200);

      expect(response.body.linkPages[0]).toHaveProperty('links');
      expect(response.body.linkPages[0].links.length).toBeGreaterThanOrEqual(2);
    });

    it('should return link page with gallery', async () => {
      const linkPage = await prisma.linkPage.create({
        data: {
          companyId,
          biography: 'Best food in town',
          bgColor: '#FFFFFF',
        },
      });

      await prisma.gallery.createMany({
        data: [
          {
            linkPageId: linkPage.id,
            title: 'Gallery 1',
            description: 'Desc 1',
            images: ['https://example.com/image1.jpg'],
          },
        ],
      });

      const response = await request(app.getHttpServer())
        .get(`/link-page/${companySlug}`)
        .expect(200);

      expect(response.body.linkPages[0]).toHaveProperty('galleries');
      expect(response.body.linkPages[0].galleries.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('PUT /link-page/:slug', () => {
    it('should update link page successfully', async () => {
      await prisma.linkPage.create({
        data: {
          companyId,
          biography: 'Original Biography',
          bgColor: '#FFFFFF',
        },
      });

      const updateDto = {
        biography: 'Updated Biography',
        coverImage: 'https://example.com/cover.jpg',
        whatsappMessage: 'Hello!',
        bgColor: '#000000',
        links: [],
        galleries: []
      };

      const response = await request(app.getHttpServer())
        .put(`/link-page/${companySlug}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(updateDto)
        .expect(200);

      expect(response.body.message).toBe('Página de links atualizada com sucesso');
    });
  });
});
