import { Module } from '@nestjs/common';
import { OpenRouterModule } from '../../integrations/openrouter/openrouter.module';
import { AdminAiModelsController } from './admin-ai-models.controller';

@Module({
  imports: [OpenRouterModule],
  controllers: [AdminAiModelsController],
})
export class AdminAiModelsModule {}
