import {
  BadRequestException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import {
  CUSTOMER_JOURNEY_REPOSITORY,
} from '../ports/customer-journey.repository.port';
import type {
  CustomerJourneyRepositoryPort,
} from '../ports/customer-journey.repository.port';
import { FollowUpSchedulerService } from '../services/follow-up-scheduler.service';
import { normalizePhone } from '../services/journey-template.service';

export interface MarkPurchaseCompleteInput {
  companyId: string;
  agentId: string;
  phone: string;
  orderId?: string;
  apiKey?: string;
}

export interface MarkPurchaseCompleteResult {
  status: string;
  journeyId: string;
  cancelledFollowUps: number;
}

@Injectable()
export class MarkPurchaseCompleteUseCase {
  constructor(
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepo: AgentRepositoryPort,
    @Inject(CUSTOMER_JOURNEY_REPOSITORY)
    private readonly journeyRepo: CustomerJourneyRepositoryPort,
    private readonly followUpScheduler: FollowUpSchedulerService,
    private readonly configService: ConfigService,
  ) {}

  async execute(input: MarkPurchaseCompleteInput): Promise<MarkPurchaseCompleteResult> {
    this.validateApiKey(input.apiKey);

    const normalized = normalizePhone(input.phone);
    if (!normalized || normalized.length < 10) {
      throw new BadRequestException('Telefone inválido.');
    }

    const agent = await this.agentRepo.findById(input.agentId);
    if (!agent || agent.companyId !== input.companyId) {
      throw new NotFoundException('Agente não encontrado para esta empresa.');
    }

    if (!agent.journeyConfig?.purchaseWebhookEnabled) {
      throw new ForbiddenException('Webhook de compra desabilitado para este agente.');
    }

    if (input.orderId) {
      const existing = await this.journeyRepo.findPurchasedByAgentAndPhone(
        input.agentId,
        normalized,
        input.orderId,
      );
      if (existing) {
        return {
          status: 'PURCHASED',
          journeyId: existing.id,
          cancelledFollowUps: 0,
        };
      }
    }

    const journey = await this.journeyRepo.findActiveByAgentAndPhone(
      input.agentId,
      normalized,
    );

    if (!journey) {
      const purchased = await this.journeyRepo.findPurchasedByAgentAndPhone(
        input.agentId,
        normalized,
      );
      if (purchased) {
        return {
          status: 'PURCHASED',
          journeyId: purchased.id,
          cancelledFollowUps: 0,
        };
      }
      throw new NotFoundException('Nenhuma jornada ativa encontrada para este telefone.');
    }

    const stepIds = (agent.journeyConfig?.followUpSteps ?? []).map((s) => s.id);
    await this.followUpScheduler.cancelForJourney(journey.id, stepIds);

    const metadata = { ...journey.metadata, ...(input.orderId ? { orderId: input.orderId } : {}) };
    await this.journeyRepo.updateStatus(journey.id, 'PURCHASED', {
      purchaseAt: new Date(),
      metadata,
    });

    return {
      status: 'PURCHASED',
      journeyId: journey.id,
      cancelledFollowUps: stepIds.length,
    };
  }

  private validateApiKey(provided?: string): void {
    const expected = this.configService.get<string>('PURCHASE_WEBHOOK_API_KEY');
    if (!expected) return;
    if (provided !== expected) {
      throw new UnauthorizedException('API key inválida.');
    }
  }
}
