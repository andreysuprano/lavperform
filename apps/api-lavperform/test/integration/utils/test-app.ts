import { Test, TestingModule, TestingModuleBuilder } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { AppModule } from '../../../src/app.module';

export class TestApp {
  private app: INestApplication;
  private moduleFixture: TestingModule;

  async setup(modifier?: (builder: TestingModuleBuilder) => TestingModuleBuilder): Promise<INestApplication> {
    // Override environment for testing
    process.env.ENVIRONMENT = 'test';
    process.env.NODE_ENV = 'test';
    process.env.ASAAS_BASE_URL = process.env.ASAAS_BASE_URL || 'http://asaas-mock.test';
    process.env.ASAAS_API_KEY = process.env.ASAAS_API_KEY || 'test-api-key';

    let builder = Test.createTestingModule({
      imports: [AppModule],
    });

    if (modifier) {
      builder = modifier(builder);
    }

    this.moduleFixture = await builder.compile();

    this.app = this.moduleFixture.createNestApplication();

    // Apply same middleware/pipes as production
    this.app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: false,
        transform: true,
      })
    );

    await this.app.init();
    return this.app;
  }

  async teardown(): Promise<void> {
    if (this.app) {
      await this.app.close();
    }
  }

  getApp(): INestApplication {
    return this.app;
  }

  getModule(): TestingModule {
    return this.moduleFixture;
  }
}