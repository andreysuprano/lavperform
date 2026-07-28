import { BullModule } from '@nestjs/bullmq';
import { BullBoardModule } from '@bull-board/nestjs';
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter';
import { Module, forwardRef } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../application/agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
  HELP_REQUEST_REPOSITORY,
} from '../../application/customer-journey/ports/customer-journey.repository.port';
import { FollowUpSchedulerService } from '../../application/customer-journey/services/follow-up-scheduler.service';
import { HelpEscalationService } from '../../application/customer-journey/services/help-escalation.service';
import { JourneyOrchestratorService } from '../../application/customer-journey/services/journey-orchestrator.service';
import { JourneyTemplateService } from '../../application/customer-journey/services/journey-template.service';
import {
  ClaimHelpRequestUseCase,
  DismissHelpRequestUseCase,
  ListHelpRequestsUseCase,
  ResolveHelpRequestUseCase,
} from '../../application/customer-journey/use-cases/help-request.use-cases';
import { MarkPurchaseCompleteUseCase } from '../../application/customer-journey/use-cases/mark-purchase-complete.use-case';
import { AttendantGateway } from '../../infrastructure/attendant/attendant.gateway';
import { CustomerJourneyController } from '../../infrastructure/http/customer-journey/customer-journey.controller';
import { PrismaCustomerJourneyRepository } from '../../infrastructure/persistence/repositories/prisma-customer-journey.repository';
import { PrismaHelpRequestRepository } from '../../infrastructure/persistence/repositories/prisma-help-request.repository';
import { PrismaAgentRepository } from '../../infrastructure/persistence/repositories/prisma-agent.repository';
import { FOLLOW_UP_QUEUE_NAME } from '../../infrastructure/queue/follow-up-queue.constants';
import { FollowUpProcessor } from '../../infrastructure/queue/follow-up.processor';
import { BullSetupModule } from '../messaging/bull.setup.module';
import { MessagingModule } from '../messaging/messaging.module';
import { AgentModule } from '../agent/agent.module';
import { CONVERSATION_REPOSITORY } from '../../application/webhook/ports/conversation.repository.port';
import { PrismaConversationRepository } from '../../infrastructure/persistence/repositories/prisma-conversation.repository';
import { HumanTakeoverService } from '../../application/webhook/services/human-takeover.service';

@Module({
  imports: [
    BullSetupModule,
    BullModule.registerQueue({ name: FOLLOW_UP_QUEUE_NAME }),
    BullBoardModule.forFeature({
      name: FOLLOW_UP_QUEUE_NAME,
      adapter: BullMQAdapter,
    }),
    MessagingModule,
    forwardRef(() => AgentModule),
  ],
  controllers: [CustomerJourneyController],
  providers: [
    AttendantGateway,
    JourneyTemplateService,
    FollowUpSchedulerService,
    FollowUpProcessor,
    HelpEscalationService,
    JourneyOrchestratorService,
    HumanTakeoverService,

    PrismaCustomerJourneyRepository,
    { provide: CUSTOMER_JOURNEY_REPOSITORY, useExisting: PrismaCustomerJourneyRepository },

    PrismaHelpRequestRepository,
    { provide: HELP_REQUEST_REPOSITORY, useExisting: PrismaHelpRequestRepository },

    PrismaAgentRepository,
    { provide: AGENT_REPOSITORY, useExisting: PrismaAgentRepository },

    PrismaConversationRepository,
    { provide: CONVERSATION_REPOSITORY, useExisting: PrismaConversationRepository },

    ListHelpRequestsUseCase,
    ClaimHelpRequestUseCase,
    ResolveHelpRequestUseCase,
    DismissHelpRequestUseCase,
    MarkPurchaseCompleteUseCase,
  ],
  exports: [
    JourneyOrchestratorService,
    HelpEscalationService,
    AttendantGateway,
    CUSTOMER_JOURNEY_REPOSITORY,
    HELP_REQUEST_REPOSITORY,
  ],
})
export class CustomerJourneyModule {}
