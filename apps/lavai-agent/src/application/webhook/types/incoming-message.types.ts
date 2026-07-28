/**
 * Tipos de domínio para mensagens recebidas via webhook.
 * Completamente agnósticos ao provider de WhatsApp utilizado.
 *
 * O provider (UAZAPI, Z-API, Evolution API, etc.) é responsável
 * por mapear seu formato proprietário para estas interfaces.
 */

export enum MessageType {
  TEXT = 'TEXT',
  AUDIO = 'AUDIO',
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  UNKNOWN = 'UNKNOWN',
}

/** Campos comuns a qualquer tipo de mensagem recebida. */
export interface BaseIncomingMessage {
  /** ID do evento de webhook que originou esta mensagem. */
  webhookEventId: string;
  /** UUID da empresa (tenant) que recebeu a mensagem. */
  companyId: string;
  /** ID único da mensagem no WhatsApp. */
  messageId: string;
  /** ID do chat (individual ou grupo). */
  chatId: string;
  /** ID interno do remetente. */
  senderId: string;
  /** Nome de exibição do remetente. */
  senderName: string;
  /** Número de telefone do remetente no formato E.164 (ex: 554199999999). */
  senderPhone: string;
  /** A mensagem foi enviada pelo próprio número da instância? */
  isFromMe: boolean;
  /**
   * A mensagem foi enviada via API (pelo próprio bot/automação)?
   * Quando false e isFromMe é true, significa que foi o atendente
   * humano quem digitou manualmente no dispositivo.
   */
  wasSentByApi: boolean;
  /** A mensagem veio de um grupo? */
  isGroup: boolean;
  /** Nome do grupo (preenchido apenas quando isGroup = true). */
  groupName?: string;
  /** Timestamp Unix em milissegundos da mensagem. */
  timestamp: number;
  /** Nome da instância WhatsApp no provider. */
  instanceName: string;
  /**
   * Token de autenticação da instância UAZAPI.
   * Necessário para baixar mídias e enviar respostas via API.
   */
  instanceToken: string;
}

export interface TextIncomingMessage extends BaseIncomingMessage {
  type: MessageType.TEXT;
  /** Conteúdo textual da mensagem. */
  text: string;
}

export interface AudioIncomingMessage extends BaseIncomingMessage {
  type: MessageType.AUDIO;
  /** URL para download do arquivo de áudio criptografado. */
  mediaUrl: string;
  /** MIME type (ex: "audio/ogg; codecs=opus"). */
  mimeType: string;
  /** Duração em segundos. */
  durationSeconds?: number;
}

export interface ImageIncomingMessage extends BaseIncomingMessage {
  type: MessageType.IMAGE;
  /** URL para download da imagem criptografada. */
  mediaUrl: string;
  /** MIME type (ex: "image/jpeg"). */
  mimeType: string;
  /** Legenda enviada junto com a imagem. */
  caption?: string;
  width?: number;
  height?: number;
  /** Thumbnail JPEG em base64 (preview da imagem, quando disponível pelo provider). */
  thumbnailBase64?: string;
}

export interface VideoIncomingMessage extends BaseIncomingMessage {
  type: MessageType.VIDEO;
  /** URL para download do vídeo criptografado. */
  mediaUrl: string;
  /** MIME type (ex: "video/mp4"). */
  mimeType: string;
  /** Legenda enviada junto com o vídeo. */
  caption?: string;
  /** Duração em segundos. */
  durationSeconds?: number;
  /** Thumbnail JPEG em base64 (frame do vídeo, fornecido pelo WhatsApp via provider). */
  thumbnailBase64?: string;
}

export interface UnknownIncomingMessage extends BaseIncomingMessage {
  type: MessageType.UNKNOWN;
  /** String de diagnóstico com o tipo original do provider. */
  rawType: string;
}

export type IncomingMessage =
  | TextIncomingMessage
  | AudioIncomingMessage
  | ImageIncomingMessage
  | VideoIncomingMessage
  | UnknownIncomingMessage;
