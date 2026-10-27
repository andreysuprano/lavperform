import { Module } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
  HELP_REQUEST_REPOSITORY,
} from '../../application/customer-journey/ports/customer-journey.repository.port';
import { CONVERSATION_REPOSITORY } from '../../application/webhook/ports/conversation.repository.port';
import { HumanReleaseService } from '../../application/webhook/services/human-release.service';
import { HumanTakeoverService } from '../../application/webhook/services/human-takeover.service';
import { MessageFilterService } from '../../application/webhook/services/message-filter.service';
import { WaitingAckService } from '../../application/webhook/services/waiting-ack.service';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';
import { PrismaConversationRepository } from '../../infrastructure/persistence/repositories/prisma-conversation.repository';
import { PrismaCustomerJourneyRepository } from '../../infrastructure/persistence/repositories/prisma-customer-journey.repository';
import { PrismaHelpRequestRepository } from '../../infrastructure/persistence/repositories/prisma-help-request.repository';
import { MessagingModule } from '../messaging/messaging.module';

@Module({
  imports: [MessagingModule],
  providers: [
    WaitingAckService,
    HumanTakeoverService,
    HumanReleaseService,
    MessageFilterService,
    PrismaAgentRepository,
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },
    PrismaConversationRepository,
    {
      provide: CONVERSATION_REPOSITORY,
      useExisting: PrismaConversationRepository,
    },
    PrismaCustomerJourneyRepository,
    {
      provide: CUSTOMER_JOURNEY_REPOSITORY,
      useExisting: PrismaCustomerJourneyRepository,
    },
    PrismaHelpRequestRepository,
    {
      provide: HELP_REQUEST_REPOSITORY,
      useExisting: PrismaHelpRequestRepository,
    },
  ],
  exports: [WaitingAckService],
})
export class AttendanceModule {}
