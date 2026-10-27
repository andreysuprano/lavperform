import { Inject, Injectable } from '@nestjs/common';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
  HELP_REQUEST_REPOSITORY,
} from '../../customer-journey/ports/customer-journey.repository.port';
import type {
  CustomerJourneyRepositoryPort,
  HelpRequestRepositoryPort,
} from '../../customer-journey/ports/customer-journey.repository.port';
import { CONVERSATION_REPOSITORY } from '../ports/conversation.repository.port';
import type { ConversationRepositoryPort } from '../ports/conversation.repository.port';
import { IdleCloseSchedulerService } from '../../customer-journey/services/idle-close-scheduler.service';
import { HumanTakeoverService } from './human-takeover.service';

@Injectable()
export class HumanReleaseService {
  constructor(
    private readonly takeover: HumanTakeoverService,
    @Inject(CONVERSATION_REPOSITORY)
    private readonly conversations: ConversationRepositoryPort,
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeys: CustomerJourneyRepositoryPort,
    @Inject(HELP_REQUEST_REPOSITORY)
    private readonly helpRequests: HelpRequestRepositoryPort,
    private readonly idleClose: IdleCloseSchedulerService,
  ) {}

  async release(agentId: string, chatId: string): Promise<void> {
    await this.takeover.clearTakeover(agentId, chatId);
    await this.idleClose.cancelChat(agentId, chatId);

    const conversations = await this.conversations.findByAgentAndChat(agentId, chatId);
    for (const conversation of conversations) {
      const journey = await this.journeys.findByConversationId(conversation.id);
      if (journey?.status === 'HELP_REQUESTED' || journey?.status === 'ESCALATED') {
        await this.journeys.updateStatus(journey.id, 'ACTIVE');
      }
    }

    const openRequests = await this.helpRequests.findOpenByAgentAndChat(agentId, chatId);
    for (const request of openRequests) {
      await this.helpRequests.updateStatus(request.id, 'RESOLVED', {
        resolvedAt: new Date(),
      });
    }
  }
}
