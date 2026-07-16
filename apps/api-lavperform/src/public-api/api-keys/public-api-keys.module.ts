import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PublicApiAuthModule } from '../auth/public-api-auth.module';
import { PublicApiKeysService } from './public-api-keys.service';

@Module({
  imports: [PrismaModule, PublicApiAuthModule],
  providers: [PublicApiKeysService],
  exports: [PublicApiKeysService],
})
export class PublicApiKeysModule {}
