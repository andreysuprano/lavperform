process.env.APP_RUNTIME = process.env.APP_RUNTIME ?? 'public-api';

import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { PublicApiModule } from './public-api/public-api.module';

import './instrument';

async function bootstrap() {
  const app = await NestFactory.create(PublicApiModule);
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

  const isFoodCrm = process.env.WHITELABEL === 'foodcrm';
  const apiName = isFoodCrm ? 'FoodCRM Api' : 'LavPerform Api';
  const platformName = isFoodCrm ? 'FoodCRM' : 'LavPerform';

  const config = new DocumentBuilder()
    .setTitle(apiName)
    .setDescription(
      `API pública para integração de sistemas externos com a plataforma ${platformName}. ` +
        'Autenticação via header x-api-key.',
    )
    .setVersion('1.0')
    .addApiKey(
      {
        type: 'apiKey',
        name: 'x-api-key',
        in: 'header',
        description: 'Chave de API',
      },
      'x-api-key',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  await app.listen(process.env.PUBLIC_API_PORT ?? 3003);
}

bootstrap();
