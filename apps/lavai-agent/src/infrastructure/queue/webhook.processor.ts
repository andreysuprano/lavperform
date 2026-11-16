import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { ProcessWebhookJobUseCase } from '../../application/webhook/use-cases/process-webhook-job.use-case';
import { MessageBufferService, BUFFER_JOB_NAME } from '../../application/webhook/services/message-buffer.service';
import type { BufferJobData } from '../../application/webhook/services/message-buffer.service';
import { HumanTypingPauseService } from '../../application/webhook/services/human-typing-pause.service';
import { HumanTakeoverService } from '../../application/webhook/services/human-takeover.service';
import { TypingResumeService } from '../../application/webhook/services/typing-resume.service';
import { decideBufferJob } from './buffer-job-decision';
import { WEBHOOK_QUEUE_NAME } from './webhook-queue.constants';

export type WebhookJobData = { webhookEventId: string; agentId: string };

@Processor(WEBHOOK_QUEUE_NAME)
export class WebhookProcessor extends WorkerHost {
  private readonly logger = new Logger(WebhookProcessor.name);

  constructor(
    private readonly processWebhookJob: ProcessWebhookJobUseCase,
    private readonly messageBuffer: MessageBufferService,
    private readonly typing: HumanTypingPauseService,
    private readonly takeover: HumanTakeoverService,
    private readonly typingResume: TypingResumeService,
  ) {
    super();
  }

  async process(job: Job<WebhookJobData | BufferJobData>): Promise<void> {
    if (job.name === BUFFER_JOB_NAME) {
      return this.processBuffer(job as Job<BufferJobData>);
    }
    return this.processSingle(job as Job<WebhookJobData>);
  }

  private async processSingle(job: Job<WebhookJobData>): Promise<void> {
    const { webhookEventId, agentId } = job.data;
    this.logger.log(`Job ${job.id} iniciado | webhookEventId=${webhookEventId} | agentId=${agentId}`);

    try {
      await this.processWebhookJob.execute(webhookEventId, agentId);
      this.logger.log(`Job ${job.id} concluído | webhookEventId=${webhookEventId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`Job ${job.id} falhou | webhookEventId=${webhookEventId} | ${msg}`);
      throw error;
    }
  }

  private async processBuffer(job: Job<BufferJobData>): Promise<void> {
    const { agentId, chatId, bufferKey } = job.data;
    this.logger.log(`[Buffer] Job ${job.id} iniciado | agentId=${agentId} | chatId=${chatId}`);

    try {
      const paused = await this.typing.isPaused(agentId, chatId);
      const takeover = await this.takeover.isInTakeover(agentId, chatId);
      const itemCount = (await this.messageBuffer.hasItems(agentId, chatId)) ? 1 : 0;
      const decision = decideBufferJob({ paused, takeover, itemCount });

      if (decision === 'reschedule') {
        const remaining = await this.typing.remainingMs(agentId, chatId);
        await this.messageBuffer.reschedule(
          agentId,
          chatId,
          remaining > 0 ? remaining : this.typing.pauseMs,
        );
        this.logger.log(`[Buffer] Job ${job.id} — atendente digitando, reagendado | chatId=${chatId}`);
        return;
      }

      if (decision === 'discard') {
        await this.messageBuffer.popBuffer(bufferKey);
        await this.typing.clearPending(agentId, chatId);
        this.logger.log(`[Buffer] Job ${job.id} — atendimento humano, buffer descartado | chatId=${chatId}`);
        return;
      }

      if (decision === 'resume') {
        await this.typingResume.resume(agentId, chatId);
        this.logger.log(`[Buffer] Job ${job.id} concluído (retomada) | chatId=${chatId}`);
        return;
      }

      const webhookEventIds = await this.messageBuffer.popBuffer(bufferKey);

      if (webhookEventIds.length === 0) {
        this.logger.warn(`[Buffer] Job ${job.id} — buffer vazio, nenhuma mensagem para processar.`);
        return;
      }

      this.logger.log(
        `[Buffer] Job ${job.id} — processando ${webhookEventIds.length} mensagem(ns) | agentId=${agentId}`,
      );

      try {
        await this.processWebhookJob.executeBatch(webhookEventIds, agentId);
      } catch (batchError) {
        await this.typing.touchPending(agentId, chatId);
        throw batchError;
      }
      this.logger.log(`[Buffer] Job ${job.id} concluído | chatId=${chatId}`);
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Buffer] Job ${job.id} falhou | chatId=${chatId} | ${msg}`);
      throw error;
    }
  }
}
