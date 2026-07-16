import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  CREDITS_CONSUME_REQUESTED_EVENT,
  CreditsConsumeRequestedPayload,
} from '../domain/credits.events';
import { CreditsService } from '../application/credits.service';

@Injectable()
export class CreditsConsumeListener {
  private readonly logger = new Logger(CreditsConsumeListener.name);

  constructor(private readonly creditsService: CreditsService) {}

  @OnEvent(CREDITS_CONSUME_REQUESTED_EVENT)
  async handle(payload: CreditsConsumeRequestedPayload) {
    try {
      await this.creditsService.consumeCredits(payload);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Erro ao consumir créditos da empresa ${payload.companyId}: ${message}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
