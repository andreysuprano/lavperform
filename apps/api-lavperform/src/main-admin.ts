process.env.APP_RUNTIME = process.env.APP_RUNTIME ?? 'admin';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AdminModule } from './admin/admin.module';

import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(AdminModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  const isFoodCrm = process.env.WHITELABEL === 'foodcrm'
  const config = new DocumentBuilder()
    .setTitle(isFoodCrm ? 'FoodCRM Admin API' : 'LavPerform Admin API')
    .setDescription(
      isFoodCrm
        ? 'API administrativa da plataforma FoodCRM'
        : 'API administrativa da plataforma LavPerform',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.ADMIN_PORT ?? 3001);
}

bootstrap();
