import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../application/agent/ports/agent.repository.port';
import { CUSTOMER_JOURNEY_REPOSITORY } from '../../application/customer-journey/ports/customer-journey.repository.port';
import type { CustomerJourneyRepositoryPort } from '../../application/customer-journey/ports/customer-journey.repository.port';
import { FollowUpSchedulerService } from '../../application/customer-journey/services/follow-up-scheduler.service';
import { MESSAGE_SENDER_PORT } from '../../application/agent-runner/ports/message-sender.port';
import type { MessageSenderPort } from '../../application/agent-runner/ports/message-sender.port';
import {
  CONVERSATION_REPOSITORY,
  MessageRole,
} from '../../application/webhook/ports/conversation.repository.port';
import type {
  ConversationMessageData,
  ConversationRepositoryPort,
} from '../../application/webhook/ports/conversation.repository.port';
import { HumanTakeoverService } from '../../application/webhook/services/human-takeover.service';
import {
  IDLE_CLOSE_QUEUE_NAME,
  IdleCloseJobData,
} from './idle-close-queue.constants';

function isRealAssistantReply(message: ConversationMessageData): boolean {
  if (message.role !== MessageRole.ASSISTANT) return false;
  return (
    message.originalType !== 'WAITING_ACK' &&
    message.originalType !== 'FOLLOW_UP' &&
    message.originalType !== 'IDLE_CLOSE'
  );
}

@Processor(IDLE_CLOSE_QUEUE_NAME)
export class IdleCloseProcessor extends WorkerHost {
  private readonly logger = new Logger(IdleCloseProcessor.name);

  constructor(
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeyRepo: CustomerJourneyRepositoryPort,
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepo: AgentRepositoryPort,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: ConversationRepositoryPort,
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
    private readonly followUpScheduler: FollowUpSchedulerService,
    private readonly takeover: HumanTakeoverService,
  ) {
    super();
  }

  async process(job: Job<IdleCloseJobData>): Promise<void> {
    const { conversationId, agentId, anchorMessageId } = job.data;

    const journey = await this.journeyRepo.findByConversationId(conversationId);
    const agent = await this.agentRepo.findById(agentId);
    const conversation = await this.conversationRepo.findById(conversationId);
    if (!journey || !agent || !conversation) {
      this.logger.debug(
        `[IdleClose] Jornada, agente ou conversa ausente | conv=${conversationId}`,
      );
      return;
    }

    const config = agent.journeyConfig;
    const closeText = config?.idleCloseMessage?.trim() ?? '';
    if (
      !agent.active ||
      !config ||
      !config.enabled ||
      !config.idleCloseEnabled ||
      !closeText
    ) {
      this.logger.debug(
        `[IdleClose] Encerramento indisponível | agent=${agentId}`,
      );
      return;
    }

    if (journey.status !== 'ACTIVE') {
      this.logger.debug(
        `[IdleClose] Jornada não ACTIVE (${journey.status}) | journey=${journey.id}`,
      );
      return;
    }

    if (await this.takeover.isInTakeover(agentId, conversation.chatId)) {
      this.logger.debug(
        `[IdleClose] Atendimento humano | agent=${agentId} | chat=${conversation.chatId}`,
      );
      return;
    }

    const anchor = await this.conversationRepo.findMessageById(anchorMessageId);
    if (!anchor || anchor.conversationId !== conversationId) {
      this.logger.debug(
        `[IdleClose] Âncora inválida | conv=${conversationId} | anchor=${anchorMessageId}`,
      );
      return;
    }

    const later = await this.conversationRepo.findMessagesAfter(
      conversationId,
      anchor.createdAt,
    );
    if (
      later.some(
        (message) =>
          message.role === MessageRole.USER || isRealAssistantReply(message),
      )
    ) {
      this.logger.debug(
        `[IdleClose] Conversa seguiu depois da âncora | conv=${conversationId}`,
      );
      return;
    }

    const idleCloseAlreadySent = later.some(
      (message) =>
        message.role === MessageRole.ASSISTANT &&
        message.originalType === 'IDLE_CLOSE',
    );

    if (!idleCloseAlreadySent) {
      await this.followUpScheduler.cancelForJourney(
        journey.id,
        (config.followUpSteps ?? []).map((step) => step.id),
      );

      const fresh = await this.journeyRepo.findByConversationId(conversationId);
      if (fresh?.status !== 'ACTIVE') {
        this.logger.debug(
          `[IdleClose] Jornada mudou antes do envio | journey=${journey.id}`,
        );
        return;
      }

      await this.messageSender.send(
        {
          instanceName: conversation.instanceName,
          instanceToken: conversation.instanceToken,
          chatId: conversation.chatId,
        },
        { type: 'text', text: closeText },
      );

      await this.conversationRepo.addMessage({
        conversationId,
        role: MessageRole.ASSISTANT,
        content: closeText,
        originalType: 'IDLE_CLOSE',
      });
    }

    await this.journeyRepo.updateStatus(journey.id, 'CLOSED');
    this.logger.log(
      `[IdleClose] Jornada encerrada | journey=${journey.id} | conv=${conversationId}`,
    );
  }
}
