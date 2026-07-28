import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Inject, Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import type {
  AgentRepositoryPort,
  FollowUpStepData,
} from '../../application/agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
} from '../../application/customer-journey/ports/customer-journey.repository.port';
import type {
  CustomerJourneyRepositoryPort,
} from '../../application/customer-journey/ports/customer-journey.repository.port';
import { JourneyTemplateService } from '../../application/customer-journey/services/journey-template.service';
import { MESSAGE_SENDER_PORT } from '../../application/agent-runner/ports/message-sender.port';
import type { MessageSenderPort } from '../../application/agent-runner/ports/message-sender.port';
import {
  CONVERSATION_REPOSITORY,
  MessageRole,
} from '../../application/webhook/ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../../application/webhook/ports/conversation.repository.port';
import {
  FOLLOW_UP_QUEUE_NAME,
  FollowUpJobData,
} from './follow-up-queue.constants';

@Processor(FOLLOW_UP_QUEUE_NAME)
export class FollowUpProcessor extends WorkerHost {
  private readonly logger = new Logger(FollowUpProcessor.name);

  constructor(
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeyRepo: CustomerJourneyRepositoryPort,
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepo: AgentRepositoryPort,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversationRepo: ConversationRepositoryPort,
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
    private readonly templateService: JourneyTemplateService,
  ) {
    super();
  }

  async process(job: Job<FollowUpJobData>): Promise<void> {
    const { journeyId, stepId, agentId, conversationId } = job.data;

    const journey = await this.journeyRepo.findByConversationId(conversationId);
    if (!journey || journey.id !== journeyId) {
      this.logger.debug(`[FollowUp] Jornada não encontrada | journey=${journeyId}`);
      return;
    }
    if (journey.status !== 'ACTIVE') {
      this.logger.debug(
        `[FollowUp] Jornada não ACTIVE (${journey.status}) | journey=${journeyId}`,
      );
      return;
    }

    const agent = await this.agentRepo.findById(agentId);
    if (!agent?.active || !agent.journeyConfig?.followUpEnabled) {
      this.logger.debug(`[FollowUp] Agente inativo ou follow-up desabilitado | agent=${agentId}`);
      return;
    }

    const steps = agent.journeyConfig.followUpSteps as FollowUpStepData[];
    const step = steps.find((s) => s.id === stepId);
    if (!step?.active) {
      this.logger.debug(`[FollowUp] Step inativo ou não encontrado | step=${stepId}`);
      return;
    }

    const conversation = await this.conversationRepo.findById(conversationId);
    if (!conversation) {
      this.logger.warn(`[FollowUp] Conversa não encontrada | conv=${conversationId}`);
      return;
    }

    const text = this.templateService.render(step.message, {
      nome: conversation.userName,
      telefone: conversation.userPhone,
    });

    await this.messageSender.send(
      {
        instanceName: conversation.instanceName,
        instanceToken: conversation.instanceToken,
        chatId: conversation.chatId,
      },
      { type: 'text', text },
    );

    await this.conversationRepo.addMessage({
      conversationId,
      role: MessageRole.ASSISTANT,
      content: text,
      originalType: 'FOLLOW_UP',
    });

    this.logger.log(
      `[FollowUp] Enviado | journey=${journeyId} | step=${stepId} | conv=${conversationId}`,
    );
  }
}
