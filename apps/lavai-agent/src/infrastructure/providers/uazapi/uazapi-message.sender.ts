import { Injectable, Logger } from '@nestjs/common';
import type {
  MessageSenderPort,
  OutgoingMessage,
  SendContext,
} from '../../../application/agent-runner/ports/message-sender.port';

type MediaOutgoingMessage = Exclude<OutgoingMessage, { type: 'text' }>;

/**
 * Adapter UAZAPI para envio de mensagens.
 *
 * Endpoints utilizados:
 *   POST /message/sendText/{instanceName}  — texto simples
 *   POST /message/sendMedia/{instanceName} — imagem, vídeo, áudio, ptt, documento, sticker
 *
 * Para trocar de provider, basta criar um novo adapter que implemente
 * MessageSenderPort e substituir o binding em MessagingModule.
 */
@Injectable()
export class UazapiMessageSender implements MessageSenderPort {
  private readonly logger = new Logger(UazapiMessageSender.name);

  async send(context: SendContext, message: OutgoingMessage): Promise<void> {
    if (message.type === 'text') {
      await this.sendText(context, message.text);
    } else {
      await this.sendMedia(context, message);
    }
  }

  // ─── Text ─────────────────────────────────────────────────────────────────

  private async sendText(context: SendContext, text: string): Promise<void> {
    const body: Record<string, unknown> = {
      number: context.chatId,
      text,
      linkPreview: false,
    };

    if (context.delay !== undefined) body.delay = context.delay;
    if (context.replyId) body.replyid = context.replyId;

    await this.request('send/text', context.instanceToken, body, context.chatId, 'text');
  }

  // ─── Media ────────────────────────────────────────────────────────────────

  private async sendMedia(
    context: SendContext,
    message: MediaOutgoingMessage,
  ): Promise<void> {
    const body: Record<string, unknown> = {
      number: context.chatId,
      type: message.type,
      url: message.url,
    };

    if ('caption' in message && message.caption)  body.caption  = message.caption;
    if ('filename' in message && message.filename) body.filename = message.filename;
    if (context.delay !== undefined) body.delay = context.delay;
    if (context.replyId) body.replyid = context.replyId;

    await this.request('send/media', context.instanceToken, body, context.chatId, message.type);
  }

  // ─── HTTP helper ──────────────────────────────────────────────────────────

  private async request(
    path: string,
    token: string,
    body: Record<string, unknown>,
    chatId: string,
    messageType: string,
  ): Promise<void> {
    const baseUrl = (process.env.UAZAPI_BASE_URL ?? 'https://free.uazapi.com').replace(/\/+$/, '');
    // UAZAPI v2: autenticação via query string ?token=...
    const url = `${baseUrl}/${path}?token=${encodeURIComponent(token)}`;

    this.logger.log(
      `[UAZAPI] Enviando ${messageType} → chatId=${chatId} | path=${path}`,
    );

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      this.logger.error(
        `[UAZAPI] Falha ao enviar ${messageType}: HTTP ${response.status} — ${responseBody}`,
      );
      throw new Error(
        `Falha ao enviar mensagem (${messageType}) via UAZAPI: ${response.status}`,
      );
    }

    this.logger.log(
      `[UAZAPI] ${messageType} enviado com sucesso → chatId=${chatId}`,
    );
  }
}
