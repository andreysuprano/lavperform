import { Module } from '@nestjs/common';
import { AGENT_RUN_TRACKER_PORT } from '../../application/agent-trace/ports/agent-run-tracker.port';
import { AGENT_RUN_QUERY_PORT } from '../../application/agent-trace/ports/agent-run-query.port';
import { AgentTraceGateway } from '../../infrastructure/agent-trace/agent-trace.gateway';
import { AgentRunTrackerService } from '../../infrastructure/agent-trace/agent-run-tracker.service';
import { PrismaAgentRunRepository } from '../../infrastructure/persistence/repositories/prisma-agent-run.repository';
import { AgentRunController } from '../../infrastructure/http/agent-trace/agent-run.controller';

@Module({
  controllers: [AgentRunController],
  providers: [
    AgentTraceGateway,

    PrismaAgentRunRepository,
    { provide: AGENT_RUN_QUERY_PORT, useExisting: PrismaAgentRunRepository },

    AgentRunTrackerService,
    { provide: AGENT_RUN_TRACKER_PORT, useExisting: AgentRunTrackerService },
  ],
  exports: [AGENT_RUN_TRACKER_PORT],
})
export class AgentTraceModule {}
