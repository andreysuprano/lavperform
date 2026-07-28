import { Module, forwardRef } from '@nestjs/common';
import { AgentRunnerService } from '../../application/agent-runner/services/agent-runner.service';
import { PromptBuilderService } from '../../application/agent-runner/services/prompt-builder.service';
import { ToolRegistry } from '../../application/agent-runner/tools/tool-registry';
import { ToolExecutorService } from '../../application/agent-runner/tools/tool-executor.service';
import { SearchKnowledgeTool } from '../../application/agent-runner/tools/builtin/search-knowledge.tool';
import { GetDatetimeTool } from '../../application/agent-runner/tools/builtin/get-datetime.tool';
import { EndConversationTool } from '../../application/agent-runner/tools/builtin/end-conversation.tool';
import { RequestHumanHelpTool } from '../../application/agent-runner/tools/builtin/request-human-help.tool';
import { McpToolLoaderService } from '../../application/agent-runner/tools/mcp/mcp-tool-loader.service';
import { CONVERSATION_REPOSITORY } from '../../application/webhook/ports/conversation.repository.port';
import { PrismaConversationRepository } from '../../infrastructure/persistence/repositories/prisma-conversation.repository';
import { LlmModule } from '../llm/llm.module';
import { RagModule } from '../rag/rag.module';
import { MessagingModule } from '../messaging/messaging.module';
import { McpModule } from '../mcp/mcp.module';
import { AgentTraceModule } from '../agent-trace/agent-trace.module';
import { CustomerJourneyModule } from '../customer-journey/customer-journey.module';
import { AgentModule } from '../agent/agent.module';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';

@Module({
  imports: [
    LlmModule,
    RagModule,
    MessagingModule,
    McpModule,
    AgentTraceModule,
    AgentModule,
    forwardRef(() => CustomerJourneyModule),
  ],
  providers: [
    PrismaConversationRepository,
    { provide: CONVERSATION_REPOSITORY, useExisting: PrismaConversationRepository },

    PrismaAgentRepository,
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },

    PromptBuilderService,
    ToolRegistry,
    ToolExecutorService,
    SearchKnowledgeTool,
    GetDatetimeTool,
    EndConversationTool,
    RequestHumanHelpTool,
    McpToolLoaderService,
    AgentRunnerService,
  ],
  exports: [AgentRunnerService],
})
export class AgentRunnerModule {}
