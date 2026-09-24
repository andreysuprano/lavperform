import { Module, forwardRef } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import { CreateAgentUseCase } from '../../application/agent/use-cases/create-agent.use-case';
import { DeleteAgentUseCase } from '../../application/agent/use-cases/delete-agent.use-case';
import { FindAgentByIdUseCase } from '../../application/agent/use-cases/find-agent-by-id.use-case';
import { ListAgentsByCompanyUseCase } from '../../application/agent/use-cases/list-agents-by-company.use-case';
import { UpdateAgentFilterConfigUseCase } from '../../application/agent/use-cases/update-agent-filter-config.use-case';
import { UpdateAgentJourneyConfigUseCase } from '../../application/agent/use-cases/update-agent-journey-config.use-case';
import { UpdateAgentMediaConfigUseCase } from '../../application/agent/use-cases/update-agent-media-config.use-case';
import { UpdateAgentMemoryConfigUseCase } from '../../application/agent/use-cases/update-agent-memory-config.use-case';
import { UpdateAgentModelConfigUseCase } from '../../application/agent/use-cases/update-agent-model-config.use-case';
import { UpdateAgentNotificationConfigUseCase } from '../../application/agent/use-cases/update-agent-notification-config.use-case';
import { UpdateAgentPersonaUseCase } from '../../application/agent/use-cases/update-agent-persona.use-case';
import { ToggleAgentActiveUseCase } from '../../application/agent/use-cases/toggle-agent-active.use-case';
import { UpdateAgentUseCase } from '../../application/agent/use-cases/update-agent.use-case';
import { AgentController } from '../../infrastructure/http/agent/agent.controller';
import { PromptStudioController } from '../../infrastructure/http/agent/prompt-studio.controller';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';
import { GeneratePromptUseCase } from '../../application/prompt-studio/generate-prompt.use-case';
import { ProposePromptEditUseCase } from '../../application/prompt-studio/propose-prompt-edit.use-case';
import { PROMPT_STUDIO_THREAD_REPOSITORY } from '../../application/prompt-studio/prompt-studio-thread.repository.port';
import { PromptStudioThreadUseCase } from '../../application/prompt-studio/prompt-studio-thread.use-case';
import { TestPromptUseCase } from '../../application/prompt-studio/test-prompt.use-case';
import { PrismaPromptStudioThreadRepository } from '../../infrastructure/persistence/repositories/prisma-prompt-studio-thread.repository';
import { LlmModule } from '../llm/llm.module';
import { AgentRunnerModule } from '../agent-runner/agent-runner.module';

@Module({
  imports: [LlmModule, forwardRef(() => AgentRunnerModule)],
  controllers: [AgentController, PromptStudioController],
  providers: [
    PrismaAgentRepository,
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },
    CreateAgentUseCase,
    ListAgentsByCompanyUseCase,
    FindAgentByIdUseCase,
    UpdateAgentUseCase,
    ToggleAgentActiveUseCase,
    UpdateAgentPersonaUseCase,
    UpdateAgentModelConfigUseCase,
    UpdateAgentMemoryConfigUseCase,
    UpdateAgentMediaConfigUseCase,
    UpdateAgentFilterConfigUseCase,
    UpdateAgentJourneyConfigUseCase,
    UpdateAgentNotificationConfigUseCase,
    DeleteAgentUseCase,
    GeneratePromptUseCase,
    TestPromptUseCase,
    ProposePromptEditUseCase,
    PrismaPromptStudioThreadRepository,
    { provide: PROMPT_STUDIO_THREAD_REPOSITORY, useExisting: PrismaPromptStudioThreadRepository },
    PromptStudioThreadUseCase,
  ],
  exports: [FindAgentByIdUseCase, PrismaAgentRepository],
})
export class AgentModule {}
