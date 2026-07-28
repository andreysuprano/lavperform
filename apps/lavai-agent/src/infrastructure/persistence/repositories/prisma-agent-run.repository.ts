import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type {
  AgentRunDetail,
  AgentRunQueryPort,
  AgentRunStepData,
  AgentRunSummary,
  PaginatedAgentRuns,
  RunFilters,
} from '../../../application/agent-trace/ports/agent-run-query.port';
import type { AgentRunStatus, AgentRunStepType } from '../../../application/agent-trace/ports/agent-run-query.port';

@Injectable()
export class PrismaAgentRunRepository implements AgentRunQueryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findMany(filters: RunFilters): Promise<PaginatedAgentRuns> {
    const page = filters.page ?? 1;
    const limit = Math.min(filters.limit ?? 20, 100);
    const skip = (page - 1) * limit;

    const where = {
      ...(filters.agentId ? { agentId: filters.agentId } : {}),
      ...(filters.companyId ? { companyId: filters.companyId } : {}),
      ...(filters.conversationId ? { conversationId: filters.conversationId } : {}),
      ...(filters.status ? { status: filters.status } : {}),
    };

    const [total, rows] = await Promise.all([
      this.prisma.agentRun.count({ where }),
      this.prisma.agentRun.findMany({
        where,
        orderBy: { startedAt: 'desc' },
        skip,
        take: limit,
        select: {
          id: true,
          agentId: true,
          companyId: true,
          conversationId: true,
          status: true,
          inputPrompt: true,
          errorMessage: true,
          startedAt: true,
          finishedAt: true,
          durationMs: true,
          iterations: true,
          totalToolCalls: true,
        },
      }),
    ]);

    const data: AgentRunSummary[] = rows.map((r) => ({
      id: r.id,
      agentId: r.agentId,
      companyId: r.companyId,
      conversationId: r.conversationId,
      status: r.status as AgentRunStatus,
      inputPrompt: r.inputPrompt,
      errorMessage: r.errorMessage,
      startedAt: r.startedAt,
      finishedAt: r.finishedAt,
      durationMs: r.durationMs,
      iterations: r.iterations,
      totalToolCalls: r.totalToolCalls,
    }));

    return { data, total, page, limit };
  }

  async findById(id: string): Promise<AgentRunDetail | null> {
    const run = await this.prisma.agentRun.findUnique({
      where: { id },
      include: {
        steps: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!run) return null;

    const steps: AgentRunStepData[] = run.steps.map((s) => ({
      id: s.id,
      agentRunId: s.agentRunId,
      stepType: s.stepType as AgentRunStepType,
      toolName: s.toolName,
      input: s.input,
      output: s.output,
      errorMessage: s.errorMessage,
      durationMs: s.durationMs,
      iteration: s.iteration,
      createdAt: s.createdAt,
    }));

    return {
      id: run.id,
      agentId: run.agentId,
      companyId: run.companyId,
      conversationId: run.conversationId,
      status: run.status as AgentRunStatus,
      inputPrompt: run.inputPrompt,
      outputText: run.outputText,
      errorMessage: run.errorMessage,
      startedAt: run.startedAt,
      finishedAt: run.finishedAt,
      durationMs: run.durationMs,
      iterations: run.iterations,
      totalToolCalls: run.totalToolCalls,
      steps,
    };
  }
}
