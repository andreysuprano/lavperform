import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiModelSettingsService } from './ai-model-settings.service';
import { OpenRouterClient } from './openrouter.client';

@Module({
  imports: [PrismaModule],
  providers: [AiModelSettingsService, OpenRouterClient],
  exports: [AiModelSettingsService, OpenRouterClient],
})
export class OpenRouterModule {}
