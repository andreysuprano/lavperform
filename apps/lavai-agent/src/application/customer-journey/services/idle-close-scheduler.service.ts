import { InjectQueue } from '@nestjs/bullmq';
import { Inject, Injectable, Logger } from '@nestjs/common';
import { Queue } from 'bullmq';
import { CONVERSATION_REPOSITORY } from '../../webhook/ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../../webhook/ports/conversation.repository.port';
import {
  buildIdleCloseJobId,
  IDLE_CLOSE_QUEUE_NAME,
  IdleCloseJobData,
} from '../../../infrastructure/queue/idle-close-queue.constants';

@Injectable()
export class IdleCloseSchedulerService {
  private readonly logger = new Logger(IdleCloseSchedulerService.name);

  constructor(
    @InjectQueue(IDLE_CLOSE_QUEUE_NAME)
    private readonly queue: Queue<IdleCloseJobData>,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
  ) {}

  async schedule(input: {
    conversationId: string;
    agentId: string;
    anchorMessageId: string;
    delayMs: number;
  }): Promise<void> {
    const jobId = buildIdleCloseJobId(input.conversationId);
    const existing = await this.queue.getJob(jobId);
    if (existing) {
      await existing.remove();
    }

    await this.queue.add(
      'close-if-idle',
      {
        conversationId: input.conversationId,
        agentId: input.agentId,
        anchorMessageId: input.anchorMessageId,
      },
      {
        jobId,
        delay: input.delayMs,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: true,
        removeOnFail: false,
      },
    );

    this.logger.log(
      `[IdleClose] Agendado | conv=${input.conversationId} | anchor=${input.anchorMessageId} | delay=${input.delayMs}ms`,
    );
  }

  async cancel(conversationId: string): Promise<void> {
    const jobId = buildIdleCloseJobId(conversationId);
    const existing = await this.queue.getJob(jobId);
    if (!existing) return;

    await existing.remove();
    this.logger.log(`[IdleClose] Cancelado | jobId=${jobId}`);
  }

  async cancelChat(agentId: string, chatId: string): Promise<void> {
    const conversations = await this.conversations.findByAgentAndChat(agentId, chatId);
    for (const conversation of conversations) {
      await this.cancel(conversation.id);
    }
  }
}
