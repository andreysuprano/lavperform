import { Module } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import { PLATFORM_COMPANY_PORT } from '../../application/platform-agent/ports/platform-company.port';
import { PLATFORM_CONVERSATION_REPOSITORY } from '../../application/platform-agent/ports/platform-conversation.repository.port';
import { CreatePlatformAgentUseCase } from '../../application/platform-agent/use-cases/create-platform-agent.use-case';
import { ListPlatformAgentsUseCase } from '../../application/platform-agent/use-cases/list-platform-agents.use-case';
import { ListPlatformTurnsUseCase } from '../../application/platform-agent/use-cases/list-platform-turns.use-case';
import { RunPlatformTurnUseCase } from '../../application/platform-agent/use-cases/run-platform-turn.use-case';
import { PlatformAgentController } from '../../infrastructure/http/platform-agent/platform-agent.controller';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';
import { PrismaPlatformCompanyService } from '../../infrastructure/persistence/repositories/prisma-platform-company.service';
import { PrismaPlatformConversationRepository } from '../../infrastructure/persistence/repositories/prisma-platform-conversation.repository';
import { AgentModule } from '../agent/agent.module';
import { AgentRunnerModule } from '../agent-runner/agent-runner.module';
import { AgentTraceModule } from '../agent-trace/agent-trace.module';
import { LlmModule } from '../llm/llm.module';

@Module({
  imports: [AgentModule, AgentRunnerModule, LlmModule, AgentTraceModule],
  controllers: [PlatformAgentController],
  providers: [
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },
    PrismaPlatformCompanyService,
    { provide: PLATFORM_COMPANY_PORT, useExisting: PrismaPlatformCompanyService },
    PrismaPlatformConversationRepository,
    { provide: PLATFORM_CONVERSATION_REPOSITORY, useExisting: PrismaPlatformConversationRepository },
    CreatePlatformAgentUseCase,
    ListPlatformAgentsUseCase,
    RunPlatformTurnUseCase,
    ListPlatformTurnsUseCase,
  ],
})
export class PlatformAgentModule {}
