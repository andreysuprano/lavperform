import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { PublicApiModule } from '../../../src/public-api/public-api.module';

export class PublicApiTestApp {
  private app: INestApplication;
  private moduleFixture: TestingModule;

  async setup(): Promise<INestApplication> {
    process.env.ENVIRONMENT = 'test';
    process.env.NODE_ENV = 'test';

    this.moduleFixture = await Test.createTestingModule({
      imports: [PublicApiModule],
    }).compile();

    this.app = this.moduleFixture.createNestApplication();
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        transform: true,
      }),
    );

    await this.app.init();
    return this.app;
  }

  async teardown(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }
}
