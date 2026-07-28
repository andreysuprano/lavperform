import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from '../src/app.module';

describe('Webhook (e2e)', () => {
  let app: INestApplication<App>;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('POST /webhooks enfileira payload', () => {
    return request(app.getHttpServer())
      .post('/webhooks')
      .send({ event: 'e2e', data: { n: 1 } })
      .expect(202)
      .expect((res) => {
        expect(res.body).toHaveProperty('jobId');
        expect(res.body).toHaveProperty('message');
      });
  });
});
