import { Module } from '@nestjs/common';
import { OverAgentApiModule } from '../../integrations/over-agent-api/over-agent-api.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AdminAiAgentsController } from './admin-ai-agents.controller';
import { PromptSheetService } from '../../ai-agent/application/prompt-sheet.service';
import { AdminAiAgentsService } from './admin-ai-agents.service';
import { ReprocessAiAgentsOnBootService } from './reprocess-ai-agents-on-boot.service';

@Module({
  imports: [PrismaModule, OverAgentApiModule],
  controllers: [AdminAiAgentsController],
  providers: [AdminAiAgentsService, ReprocessAiAgentsOnBootService, PromptSheetService],
})
export class AdminAiAgentsModule {}