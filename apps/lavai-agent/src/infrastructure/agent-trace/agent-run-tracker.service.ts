import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../persistence/prisma/prisma.service';
import type {
  AddStepData,
  AgentRunTrackerPort,
  StartRunData,
} from '../../application/agent-trace/ports/agent-run-tracker.port';
import { AgentTraceGateway } from './agent-trace.gateway';
import type { AgentRunStepData } from '../../application/agent-trace/ports/agent-run-query.port';

@Injectable()
export class AgentRunTrackerService implements AgentRunTrackerPort {
  private readonly logger = new Logger(AgentRunTrackerService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly gateway: AgentTraceGateway,
  ) {}

  async startRun(data: StartRunData): Promise<string> {
    try {
      const run = await this.prisma.agentRun.create({
        data: {
          agentId: data.agentId,
          companyId: data.companyId,
          conversationId: data.conversationId,
          inputPrompt: data.inputPrompt,
          status: 'RUNNING',
        },
      });

      this.gateway.emitRunStarted(data.agentId, {
        runId: run.id,
        agentId: run.agentId,
        companyId: run.companyId,
        conversationId: run.conversationId,
        inputPrompt: run.inputPrompt ?? undefined,
        startedAt: run.startedAt,
      });

      return run.id;
    } catch (err) {
      this.logger.error('Failed to start run trace', err);
      return '';
    }
  }

  async addStep(runId: string, step: AddStepData): Promise<void> {
    if (!runId) return;

    try {
      const created = await this.prisma.agentRunStep.create({
        data: {
          agentRunId: runId,
          stepType: step.stepType,
          toolName: step.toolName ?? null,
          input: step.input !== undefined ? (step.input as object) : undefined,
          output: step.output !== undefined ? (step.output as object) : undefined,
          errorMessage: step.errorMessage ?? null,
          durationMs: step.durationMs ?? null,
          iteration: step.iteration ?? 0,
        },
      });

      const run = await this.prisma.agentRun.findUnique({
        select: { agentId: true },
        where: { id: runId },
      });

      if (run) {
        const stepData: AgentRunStepData = {
          id: created.id,
          agentRunId: created.agentRunId,
          stepType: created.stepType as AgentRunStepData['stepType'],
          toolName: created.toolName,
          input: created.input,
          output: created.output,
          errorMessage: created.errorMessage,
          durationMs: created.durationMs,
          iteration: created.iteration,
          createdAt: created.createdAt,
        };

        this.gateway.emitRunStep(run.agentId, {
          runId,
          agentId: run.agentId,
          step: stepData,
        });
      }
    } catch (err) {
      this.logger.error('Failed to add run step trace', err);
    }
  }

  async completeRun(
    runId: string,
    outputText: string,
    iterations: number,
    totalToolCalls: number,
  ): Promise<void> {
    if (!runId) return;

    try {
      const run = await this.prisma.agentRun.findUnique({
        select: { agentId: true, startedAt: true },
        where: { id: runId },
      });

      if (!run) return;

      const finishedAt = new Date();
      const durationMs = finishedAt.getTime() - run.startedAt.getTime();

      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'COMPLETED',
          outputText,
          finishedAt,
          durationMs,
          iterations,
          totalToolCalls,
        },
      });

      this.gateway.emitRunCompleted(run.agentId, {
        runId,
        agentId: run.agentId,
        outputText,
        iterations,
        totalToolCalls,
        durationMs,
        finishedAt,
      });
    } catch (err) {
      this.logger.error('Failed to complete run trace', err);
    }
  }

  async failRun(runId: string, errorMessage: string): Promise<void> {
    if (!runId) return;

    try {
      const run = await this.prisma.agentRun.findUnique({
        select: { agentId: true, startedAt: true },
        where: { id: runId },
      });

      if (!run) return;

      const finishedAt = new Date();

      await this.prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage,
          finishedAt,
          durationMs: finishedAt.getTime() - run.startedAt.getTime(),
        },
      });

      this.gateway.emitRunFailed(run.agentId, {
        runId,
        agentId: run.agentId,
        errorMessage,
        finishedAt,
      });
    } catch (err) {
      this.logger.error('Failed to fail run trace', err);
    }
  }
}
