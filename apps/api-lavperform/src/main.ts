import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import "./instrument";

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors({
    origin: '*',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    optionsSuccessStatus: 204,
    credentials: true,
  });

  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  const isFoodCrm = process.env.WHITELABEL === 'foodcrm'
  const config = new DocumentBuilder()
    .setTitle(isFoodCrm ? 'FoodCRM API' : 'LavPerform API')
    .setDescription(
      isFoodCrm
        ? 'CRM Para Deliverys e Restaurantes'
        : 'CRM para lavanderias',
    )
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document, {
    swaggerOptions:{
      persistAuthorization: true,
    }
  });

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
