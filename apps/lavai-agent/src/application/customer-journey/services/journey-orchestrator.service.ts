import { Inject, Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  CustomerJourneyStatus,
  JourneyTrigger,
} from '../../agent/ports/agent.repository.port';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
} from '../ports/customer-journey.repository.port';
import type {
  CustomerJourneyData,
  CustomerJourneyRepositoryPort,
} from '../ports/customer-journey.repository.port';
import type { ConversationData } from '../../webhook/ports/conversation.repository.port';
import { FollowUpSchedulerService } from './follow-up-scheduler.service';
import { HelpEscalationService } from './help-escalation.service';
import { matchesHelpKeyword } from './journey-template.service';

export interface OnInboundMessageInput {
  agent: AgentWithConfigsData;
  conversation: ConversationData;
  message: string;
}

export interface OnInboundMessageResult {
  skipLlm: boolean;
  escalated: boolean;
}

@Injectable()
export class JourneyOrchestratorService {
  private readonly logger = new Logger(JourneyOrchestratorService.name);
  private readonly journeyResetTimeoutMs: number;

  constructor(
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeyRepo: CustomerJourneyRepositoryPort,
    private readonly followUpScheduler: FollowUpSchedulerService,
    private readonly helpEscalation: HelpEscalationService,
    configService: ConfigService,
  ) {
    this.journeyResetTimeoutMs = configService.get<number>(
      'HUMAN_TAKEOVER_TIMEOUT_MS',
      10 * 60 * 1000,
    );
  }

  async onInboundMessage(input: OnInboundMessageInput): Promise<OnInboundMessageResult> {
    const { agent, conversation, message } = input;
    const config = agent.journeyConfig;

    if (!config?.enabled) {
      return { skipLlm: false, escalated: false };
    }

    let journey = await this.journeyRepo.findByConversationId(conversation.id);

    if (!journey && config.journeyTrigger === JourneyTrigger.FIRST_MESSAGE) {
      journey = await this.startJourney(agent, conversation);
    }

    if (!journey) {
      return { skipLlm: false, escalated: false };
    }

    if (this.isEscalatedStatus(journey.status)) {
      if (this.isJourneyEscalationExpired(journey)) {
        journey = await this.resetExpiredJourney(agent, journey);
      } else {
        return { skipLlm: true, escalated: false };
      }
    }

    if (
      journey.status === CustomerJourneyStatus.PURCHASED ||
      journey.status === CustomerJourneyStatus.CLOSED
    ) {
      return { skipLlm: false, escalated: false };
    }

    if (
      config.cancelOnReply &&
      journey.status === CustomerJourneyStatus.ACTIVE
    ) {
      const stepIds = config.followUpSteps.map((s) => s.id);
      await this.followUpScheduler.cancelForJourney(journey.id, stepIds);
    }

    if (
      config.helpAutoEscalate &&
      matchesHelpKeyword(message, config.helpKeywords)
    ) {
      const result = await this.helpEscalation.escalate({
        agent,
        conversation,
        lastMessage: message,
      });
      return { skipLlm: true, escalated: !result.alreadyEscalated || result.helpRequestId !== '' };
    }

    return { skipLlm: false, escalated: false };
  }

  private isEscalatedStatus(status: string): boolean {
    return (
      status === CustomerJourneyStatus.HELP_REQUESTED ||
      status === CustomerJourneyStatus.ESCALATED
    );
  }

  private isJourneyEscalationExpired(journey: CustomerJourneyData): boolean {
    const referenceAt = journey.helpRequestedAt ?? journey.startedAt;
    return Date.now() - referenceAt.getTime() >= this.journeyResetTimeoutMs;
  }

  private async resetExpiredJourney(
    agent: AgentWithConfigsData,
    journey: CustomerJourneyData,
  ): Promise<CustomerJourneyData> {
    this.logger.log(
      `[Journey] Reset após ${this.journeyResetTimeoutMs}ms | id=${journey.id} | conv=${journey.conversationId}`,
    );

    const stepIds = (agent.journeyConfig?.followUpSteps ?? []).map((s) => s.id);
    await this.followUpScheduler.cancelForJourney(journey.id, stepIds);

    return this.journeyRepo.updateStatus(journey.id, CustomerJourneyStatus.CLOSED);
  }

  private async startJourney(
    agent: AgentWithConfigsData,
    conversation: ConversationData,
  ) {
    const journey = await this.journeyRepo.create({
      agentId: agent.id,
      conversationId: conversation.id,
      userPhone: conversation.userPhone,
    });

    this.logger.log(
      `[Journey] Iniciada | id=${journey.id} | conv=${conversation.id}`,
    );

    const config = agent.journeyConfig;
    if (config?.followUpEnabled && config.followUpSteps.length > 0) {
      await this.followUpScheduler.scheduleForJourney(
        journey.id,
        agent.id,
        conversation.id,
        config.followUpSteps,
        journey.startedAt,
      );
    }

    return journey;
  }
}
