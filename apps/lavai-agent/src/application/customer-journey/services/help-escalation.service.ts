import { Inject, Injectable, Logger } from '@nestjs/common';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
  HELP_REQUEST_REPOSITORY,
} from '../ports/customer-journey.repository.port';
import type {
  CustomerJourneyRepositoryPort,
  HelpRequestRepositoryPort,
} from '../ports/customer-journey.repository.port';
import type { ConversationData } from '../../webhook/ports/conversation.repository.port';
import { HumanTakeoverService } from '../../webhook/services/human-takeover.service';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { AttendantGateway } from '../../../infrastructure/attendant/attendant.gateway';
import { MESSAGE_SENDER_PORT } from '../../agent-runner/ports/message-sender.port';
import type { MessageSenderPort } from '../../agent-runner/ports/message-sender.port';

export interface EscalateInput {
  agent: AgentWithConfigsData;
  conversation: ConversationData;
  lastMessage?: string;
}

@Injectable()
export class HelpEscalationService {
  private readonly logger = new Logger(HelpEscalationService.name);

  constructor(
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeyRepo: CustomerJourneyRepositoryPort,
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly helpRequestRepo: HelpRequestRepositoryPort,
    private readonly humanTakeover: HumanTakeoverService,
    private readonly followUpScheduler: FollowUpSchedulerService,
    private readonly attendantGateway: AttendantGateway,
    @Inject(MESSAGE_SENDER_PORT)
    private readonly messageSender: MessageSenderPort,
  ) {}

  async escalate(input: EscalateInput): Promise<{ helpRequestId: string; alreadyEscalated: boolean }> {
    const { agent, conversation, lastMessage } = input;
    const journey = await this.journeyRepo.findByConversationId(conversation.id);

    if (
      journey &&
      (journey.status === 'HELP_REQUESTED' || journey.status === 'ESCALATED')
    ) {
      return { helpRequestId: '', alreadyEscalated: true };
    }

    const duplicate = await this.helpRequestRepo.findPendingDuplicate(
      agent.id,
      conversation.id,
      5,
    );
    if (duplicate) {
      return { helpRequestId: duplicate.id, alreadyEscalated: true };
    }

    const helpRequest = await this.helpRequestRepo.create({
      agentId: agent.id,
      companyId: conversation.companyId,
      conversationId: conversation.id,
      userName: conversation.userName,
      userPhone: conversation.userPhone,
      chatId: conversation.chatId,
      lastMessage,
    });

    if (journey) {
      await this.journeyRepo.updateStatus(journey.id, 'HELP_REQUESTED', {
        helpRequestedAt: new Date(),
      });
      const stepIds = (agent.journeyConfig?.followUpSteps ?? []).map((s) => s.id);
      await this.followUpScheduler.cancelForJourney(journey.id, stepIds);
    }

    await this.humanTakeover.setTakeover(agent.id, conversation.chatId);

    const ack = agent.journeyConfig?.helpAckMessage?.trim();
    if (ack) {
      await this.messageSender.send(
        {
          instanceName: conversation.instanceName,
          instanceToken: conversation.instanceToken,
          chatId: conversation.chatId,
        },
        { type: 'text', text: ack },
      );
    }

    this.attendantGateway.emitHelpRequested(agent.id, {
      helpRequestId: helpRequest.id,
      agentId: agent.id,
      companyId: conversation.companyId,
      conversationId: conversation.id,
      userName: conversation.userName,
      userPhone: conversation.userPhone,
      chatId: conversation.chatId,
      lastMessage: lastMessage ?? null,
      requestedAt: helpRequest.requestedAt.toISOString(),
    });

    this.logger.log(
      `[Escalation] Ajuda solicitada | helpRequest=${helpRequest.id} | phone=${conversation.userPhone}`,
    );

    return { helpRequestId: helpRequest.id, alreadyEscalated: false };
  }
}
