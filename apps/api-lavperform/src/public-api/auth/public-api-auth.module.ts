import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { ApiKeyGuard } from './guards/api-key.guard';
import { ApiKeyService } from './api-key.service';

@Module({
  imports: [PrismaModule],
  providers: [ApiKeyService, ApiKeyGuard],
  exports: [ApiKeyService, ApiKeyGuard],
})
export class PublicApiAuthModule {}
