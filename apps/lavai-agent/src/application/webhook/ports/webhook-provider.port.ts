import type { IncomingMessage } from '../types/incoming-message.types';

export const WEBHOOK_PROVIDER_PORT = Symbol('WEBHOOK_PROVIDER_PORT');

/**
 * Port que abstrai o provider de WhatsApp (UAZAPI, Z-API, Evolution API, etc.).
 * A camada de application só depende desta interface — nunca de uma
 * implementação concreta.
 *
 * Para trocar de provider basta criar um novo adapter em infrastructure/providers
 * e alterar o binding no módulo NestJS.
 */
export interface WebhookProviderPort {
  /**
   * Converte o payload bruto recebido no webhook em uma mensagem
   * normalizada de domínio, independente do provider.
   */
  parse(
    rawPayload: string,
    webhookEventId: string,
    companyId: string,
  ): IncomingMessage;
}
