import { Module } from '@nestjs/common';
import { PublicApiAuthModule } from '../auth/public-api-auth.module';
import { PublicApiOrderIngestionModule } from './public-api-order-ingestion.module';
import { PublicOrdersController } from './presentation/public-orders.controller';

@Module({
  imports: [PublicApiAuthModule, PublicApiOrderIngestionModule],
  controllers: [PublicOrdersController],
})
export class PublicOrdersModule {}
