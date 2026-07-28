import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import type { FollowUpStepData } from '../../agent/ports/agent.repository.port';
import {
  buildFollowUpJobId,
  FOLLOW_UP_QUEUE_NAME,
  FollowUpJobData,
} from '../../../infrastructure/queue/follow-up-queue.constants';
import { computeStepDelayMs } from './journey-template.service';

@Injectable()
export class FollowUpSchedulerService {
  private readonly logger = new Logger(FollowUpSchedulerService.name);
  private readonly maxRetries = parseInt(process.env.FOLLOW_UP_MAX_RETRIES ?? '3', 10);

  constructor(
    @InjectQueue(FOLLOW_UP_QUEUE_NAME)
    private readonly queue: Queue<FollowUpJobData>,
  ) {}

  async scheduleForJourney(
    journeyId: string,
    agentId: string,
    conversationId: string,
    steps: FollowUpStepData[],
    journeyStartedAt: Date,
  ): Promise<void> {
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      if (!step.active) continue;

      const delayMs = computeStepDelayMs(steps, i, journeyStartedAt);
      if (delayMs < 0) continue;

      const jobId = buildFollowUpJobId(journeyId, step.id);
      try {
        await this.queue.add(
          'send-follow-up',
          {
            journeyId,
            stepId: step.id,
            agentId,
            conversationId,
            scheduledFor: new Date(Date.now() + delayMs).toISOString(),
          },
          {
            jobId,
            delay: delayMs,
            attempts: this.maxRetries,
            backoff: { type: 'exponential', delay: 5000 },
            removeOnComplete: true,
            removeOnFail: false,
          },
        );
        this.logger.log(
          `[FollowUp] Agendado | journey=${journeyId} | step=${step.id} | delay=${delayMs}ms`,
        );
      } catch (err) {
        this.logger.error(
          `[FollowUp] Falha ao agendar | journey=${journeyId} | step=${step.id}`,
          err,
        );
      }
    }
  }

  async cancelForJourney(journeyId: string, stepIds: string[]): Promise<void> {
    for (const stepId of stepIds) {
      const jobId = buildFollowUpJobId(journeyId, stepId);
      try {
        const job = await this.queue.getJob(jobId);
        if (job) {
          await job.remove();
          this.logger.log(`[FollowUp] Cancelado | jobId=${jobId}`);
        }
      } catch (err) {
        this.logger.warn(`[FollowUp] Erro ao cancelar job ${jobId}`, err);
      }
    }
  }
}
