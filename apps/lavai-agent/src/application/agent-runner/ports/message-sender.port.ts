export const MESSAGE_SENDER_PORT = Symbol('MESSAGE_SENDER_PORT');

// ─── Outgoing message types (discriminated union) ─────────────────────────────

export type OutgoingMessage =
  | { type: 'text'; text: string }
  | { type: 'image'; url: string; caption?: string }
  | { type: 'document'; url: string; filename: string; caption?: string }
  | { type: 'audio'; url: string }
  | { type: 'ptt'; url: string } // push-to-talk / nota de voz
  | { type: 'video'; url: string; caption?: string }
  | { type: 'sticker'; url: string };

// ─── Send context (provider-agnostic routing info) ────────────────────────────

export interface SendContext {
  instanceName: string;
  instanceToken: string;
  /** chatId do WhatsApp — número E.164 ou groupId@g.us */
  chatId: string;
  /** Atraso em ms antes do envio (exibe "Digitando..." ou "Gravando...") */
  delay?: number;
  /** ID da mensagem original para encadear uma resposta (reply) */
  replyId?: string;
}

// ─── Port interface ───────────────────────────────────────────────────────────

export interface MessageSenderPort {
  /**
   * Envia uma mensagem ao destinatário identificado por `context`.
   * O tipo concreto de `message` determina o endpoint/payload usado pelo adapter.
   */
  send(context: SendContext, message: OutgoingMessage): Promise<void>;
}
