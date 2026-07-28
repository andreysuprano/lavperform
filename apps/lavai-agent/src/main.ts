import { Logger, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['log', 'error', 'warn', 'debug', 'verbose'],
  });
  const logger = new Logger('Bootstrap');

  const corsOriginsEnv = process.env.CORS_ORIGINS?.trim();
  const corsOrigin =
    !corsOriginsEnv || corsOriginsEnv === '*'
      ? true
      : corsOriginsEnv.split(',').map((o) => o.trim());

  app.enableCors({
    origin: corsOrigin,
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept', 'Authorization'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
    }),
  );

  const swaggerConfig = new DocumentBuilder()
    .setTitle('LavAI Agent API')
    .setDescription(
      'API com webhook (sem autenticação), fila BullMQ/Redis e persistência Prisma.',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, swaggerConfig);
  SwaggerModule.setup('docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`HTTP server ouvindo na porta ${port}`);
  logger.log(`Swagger UI disponível em: http://localhost:${port}/docs`);
  logger.log(`Bull Board disponível em: http://localhost:${port}/queues`);
}

void bootstrap();
