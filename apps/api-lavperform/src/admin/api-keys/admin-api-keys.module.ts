import { Module } from '@nestjs/common';
import { PublicApiKeysModule } from '../../public-api/api-keys/public-api-keys.module';
import { AdminApiKeysController } from './admin-api-keys.controller';
import { AdminApiKeysService } from './admin-api-keys.service';

@Module({
  imports: [PublicApiKeysModule],
  controllers: [AdminApiKeysController],
  providers: [AdminApiKeysService],
})
export class AdminApiKeysModule {}
