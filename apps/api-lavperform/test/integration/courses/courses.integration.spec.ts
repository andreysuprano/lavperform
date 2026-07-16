import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { PrismaClient } from '@prisma/client';
import { TestApp } from '../utils/test-app';
import { DatabaseCleaner } from '../utils/db-cleaner';
import { AuthHelper } from '../utils/auth-helper';
import { CourseFactory } from '../fixtures/course.factory';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

describe('Courses (Integration)', () => {
  let app: INestApplication;
  let testApp: TestApp;
  let prisma: PrismaClient;
  let dbCleaner: DatabaseCleaner;
  let authHelper: AuthHelper;
  let courseFactory: CourseFactory;
  let authToken: string;

  beforeAll(async () => {
    testApp = new TestApp();
    app = await testApp.setup();
    const pool = new Pool({ connectionString: process.env.DATABASE_URL });
    const adapter = new PrismaPg(pool);
    prisma = new PrismaClient({ adapter });
    dbCleaner = new DatabaseCleaner(prisma);
    authHelper = new AuthHelper(prisma);
    courseFactory = new CourseFactory(prisma);
  });

  afterAll(async () => {
    await prisma.$disconnect();
    await testApp.teardown();
  });

  beforeEach(async () => {
    const { token } = await authHelper.createAuthenticatedUser();
    authToken = token;
  });

  afterEach(async () => {
    await dbCleaner.cleanAll();
  });

  describe('POST /courses', () => {
    it('should create a course successfully', async () => {
      const createDto = {
        title: 'New Course',
        description: 'Course Description',
        coverImageUrl: 'https://example.com/image.jpg',
      };

      const response = await request(app.getHttpServer())
        .post('/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .send(createDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createDto.title);
      expect(response.body.description).toBe(createDto.description);
    });

    it('should return 401 without authentication', async () => {
      const createDto = {
        title: 'New Course',
        description: 'Course Description',
        coverImageUrl: 'https://example.com/image.jpg',
      };

      await request(app.getHttpServer())
        .post('/courses')
        .send(createDto)
        .expect(401);
    });
  });

  describe('GET /courses', () => {
    it('should return all courses', async () => {
      await courseFactory.createMany(3);

      const response = await request(app.getHttpServer())
        .get('/courses')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body.length).toBe(3);
    });
  });

  describe('GET /courses/:id', () => {
    it('should return a course by id with modules', async () => {
      const course = await courseFactory.create();

      const response = await request(app.getHttpServer())
        .get(`/courses/${course.id}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);

      expect(response.body.id).toBe(course.id);
      expect(response.body).toHaveProperty('modules');
    });
  });

  describe('POST /courses/:courseId/modules', () => {
    it('should create a module with lessons successfully', async () => {
      const course = await courseFactory.create();

      const createModuleDto = {
        title: 'Module 1',
        description: 'Module Description',
        lessons: [
          {
            title: 'Lesson 1',
            description: 'Lesson Description',
            videoUrl: 'https://example.com/video.mp4',
            thumbnailUrl: 'https://example.com/thumb.jpg',
            lessonFiles: [
              {
                name: 'File 1',
                fileUrl: 'https://example.com/file.pdf',
              },
            ],
          },
        ],
      };

      const response = await request(app.getHttpServer())
        .post(`/courses/${course.id}/modules`)
        .set('Authorization', `Bearer ${authToken}`)
        .send(createModuleDto)
        .expect(201);

      expect(response.body).toHaveProperty('id');
      expect(response.body.title).toBe(createModuleDto.title);
      
      // Verify in DB
      const module = await prisma.module.findUnique({
        where: { id: response.body.id },
        include: { lessons: { include: { lessonFiles: true } } },
      });

      expect(module).toBeDefined();
      expect(module!.lessons).toHaveLength(1);
      expect(module!.lessons[0].lessonFiles).toHaveLength(1);
    });
  });
});
