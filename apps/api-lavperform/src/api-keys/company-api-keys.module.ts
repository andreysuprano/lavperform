import { Module } from '@nestjs/common';
import { PublicApiKeysModule } from '../public-api/api-keys/public-api-keys.module';
import { CompanyApiKeysController } from './company-api-keys.controller';

@Module({
  imports: [PublicApiKeysModule],
  controllers: [CompanyApiKeysController],
})
export class CompanyApiKeysModule {}
