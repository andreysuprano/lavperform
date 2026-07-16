import { Injectable, Logger, Inject } from '@nestjs/common';
import { IWebhookReceivedRepository } from '../domain/webhook-received.repository.interface';

/**
 * Serviço de webhooks genéricos.
 * Integrações food (Cardápio Web / Anota AI) foram removidas do LavPerform.
 * Webhooks de lavanderia ficam nos módulos dedicados (Consumer, VmLav, etc.).
 */
@Injectable()
export class WebhooksService {
  private readonly logger = new Logger('WEBHOOKS');

  constructor(
    @Inject('IWebhookReceivedRepository')
    private readonly webhookReceivedRepository: IWebhookReceivedRepository,
  ) {}
}
