import { Injectable, Logger } from '@nestjs/common';
import {
  AudioIncomingMessage,
  BaseIncomingMessage,
  ImageIncomingMessage,
  IncomingMessage,
  MessageType,
  TextIncomingMessage,
  VideoIncomingMessage,
} from '../../../application/webhook/types/incoming-message.types';
import type { WebhookProviderPort } from '../../../application/webhook/ports/webhook-provider.port';
import {
  UazapiMediaContent,
  UazapiWebhookBody,
} from './uazapi-message.types';

/**
 * Adapter UAZAPI → IncomingMessage.
 *
 * Toda a lógica de mapeamento do formato proprietário da UAZAPI fica
 * encapsulada aqui. Se o provider mudar, basta criar um novo adapter
 * (ex: ZApiWebhookAdapter) e substituir o binding no módulo.
 */
@Injectable()
export class UazapiWebhookAdapter implements WebhookProviderPort {
  private readonly logger = new Logger(UazapiWebhookAdapter.name);

  parse(
    rawPayload: string,
    webhookEventId: string,
    companyId: string,
  ): IncomingMessage {
    this.logger.log(
      `[Parser] Iniciando parse | event=${webhookEventId} | companyId=${companyId}`,
    );

    const body = JSON.parse(rawPayload) as UazapiWebhookBody;
    const { message } = body;

    this.logger.debug(
      `[Parser] Corpo do evento | instanceName=${body.instanceName} | type="${message.type}" | mediaType="${message.mediaType ?? '-'}" | fromMe=${message.fromMe} | sender=${message.sender} | chatId=${message.chatid}`,
    );

    const base: BaseIncomingMessage = {
      webhookEventId,
      companyId,
      messageId: message.messageid,
      chatId: message.chatid,
      senderId: message.sender,
      senderName: message.senderName,
      senderPhone: this.normalizePhone(message.sender_pn ?? message.sender),
      isFromMe: message.fromMe,
      wasSentByApi: message.wasSentByApi,
      isGroup: message.isGroup,
      groupName: message.groupName,
      timestamp: message.messageTimestamp,
      instanceName: body.instanceName,
      instanceToken: body.token,
    };

    if (message.type === 'text') {
      this.logger.log(
        `[Parser] Mapeado como TEXT | event=${webhookEventId} | texto="${(message.text ?? '').slice(0, 80)}"`,
      );
      return {
        ...base,
        type: MessageType.TEXT,
        text: message.text,
      } satisfies TextIncomingMessage;
    }

    if (message.type === 'media') {
      const content = message.content as UazapiMediaContent;

      switch (message.mediaType) {
        case 'audio':
          this.logger.log(`[Parser] Mapeado como AUDIO | event=${webhookEventId} | mimeType=${content.mimetype ?? 'audio/ogg'} | url=${content.URL ?? '-'}`);
          return {
            ...base,
            type: MessageType.AUDIO,
            mediaUrl: content.URL ?? '',
            mimeType: content.mimetype ?? 'audio/ogg',
            durationSeconds: content.seconds,
          } satisfies AudioIncomingMessage;

        case 'image':
          this.logger.log(`[Parser] Mapeado como IMAGE | event=${webhookEventId} | mimeType=${content.mimetype ?? 'image/jpeg'} | url=${content.URL ?? '-'}`);
          return {
            ...base,
            type: MessageType.IMAGE,
            mediaUrl: content.URL ?? '',
            mimeType: content.mimetype ?? 'image/jpeg',
            caption: content.caption,
            width: content.width,
            height: content.height,
            thumbnailBase64: content.JPEGThumbnail,
          } satisfies ImageIncomingMessage;

        case 'video':
          this.logger.log(`[Parser] Mapeado como VIDEO | event=${webhookEventId} | mimeType=${content.mimetype ?? 'video/mp4'} | url=${content.URL ?? '-'}`);
          return {
            ...base,
            type: MessageType.VIDEO,
            mediaUrl: content.URL ?? '',
            mimeType: content.mimetype ?? 'video/mp4',
            caption: content.caption,
            thumbnailBase64: content.JPEGThumbnail,
          } satisfies VideoIncomingMessage;

        default:
          this.logger.warn(
            `mediaType desconhecido: "${message.mediaType}" (event=${webhookEventId})`,
          );
      }
    }

    this.logger.warn(
      `Tipo não mapeado: type="${message.type}" messageType="${message.messageType}" (event=${webhookEventId})`,
    );

    return {
      ...base,
      type: MessageType.UNKNOWN,
      rawType: `${message.type}/${message.mediaType}/${message.messageType}`,
    };
  }

  /** Remove sufixo WhatsApp (ex: "@s.whatsapp.net") e retorna só o número. */
  private normalizePhone(raw: string): string {
    return raw.replace(/@.+$/, '');
  }
}
