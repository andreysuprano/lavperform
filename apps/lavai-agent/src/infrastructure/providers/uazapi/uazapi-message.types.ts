/**
 * Tipos que representam o payload proprietário enviado pela UAZAPI via webhook.
 * Ficam isolados na camada de infraestrutura — a camada de application
 * nunca deve importar daqui diretamente.
 */

export interface UazapiMediaContent {
  URL?: string;
  mimetype?: string;
  caption?: string;
  fileSHA256?: string;
  fileLength?: number;
  mediaKey?: string;
  fileEncSHA256?: string;
  directPath?: string;
  mediaKeyTimestamp?: number;
  seconds?: number;
  waveform?: string;
  height?: number;
  width?: number;
  JPEGThumbnail?: string;
  contextInfo?: Record<string, unknown>;
  [key: string]: unknown;
}

export interface UazapiMessage {
  id: string;
  messageid: string;
  chatid: string;
  chatlid?: string;
  sender: string;
  sender_lid?: string;
  sender_pn?: string;
  senderName: string;
  owner: string;
  fromMe: boolean;
  isGroup: boolean;
  groupName?: string;
  /** "text" | "media" */
  type: string;
  /** "Conversation" | "AudioMessage" | "ImageMessage" | "VideoMessage" | ... */
  messageType: string;
  /** "" | "audio" | "image" | "video" */
  mediaType: string;
  text: string;
  content: UazapiMediaContent | string;
  messageTimestamp: number;
  wasSentByApi: boolean;
  quoted?: string;
  reaction?: string;
  buttonOrListid?: string;
  source?: string;
  status?: string;
  edited?: string;
  track_id?: string;
  track_source?: string;
  vote?: string;
  pinned?: boolean;
}

export interface UazapiWebhookBody {
  BaseUrl: string;
  EventType: string;
  instanceName: string;
  owner: string;
  token: string;
  chatSource: string;
  chat: Record<string, unknown>;
  message: UazapiMessage;
}
