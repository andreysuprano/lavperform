import { Inject, Injectable, Logger } from '@nestjs/common';
import {
  AudioIncomingMessage,
  ImageIncomingMessage,
  IncomingMessage,
  MessageType,
  TextIncomingMessage,
  VideoIncomingMessage,
} from '../types/incoming-message.types';
import {
  AgentMessageContext,
  NormalizedAgentPrompt,
} from '../types/normalized-agent-prompt.types';
import { MEDIA_PROCESSOR_PORT } from '../ports/media-processor.port';
import type { MediaProcessorPort } from '../ports/media-processor.port';
import type { AgentWithConfigsData } from '../../agent/ports/agent.repository.port';

const DEFAULT_IMAGE_EXTRACTION_PROMPT =
  'Descreva detalhadamente o conteúdo desta imagem: objetos, texto visível, cores, contexto e qualquer informação relevante para atendimento ao cliente.';

const DEFAULT_VIDEO_EXTRACTION_PROMPT =
  'Analise este frame de vídeo e descreva o conteúdo: cena, pessoas, objetos, texto visível e contexto geral.';

const DEFAULT_AUDIO_DISABLED_MESSAGE =
  'Desculpe, não consigo processar mensagens de áudio no momento. Por favor, envie sua mensagem em texto.';

const DEFAULT_IMAGE_DISABLED_MESSAGE =
  'Desculpe, não consigo processar imagens no momento. Por favor, descreva o que você precisa em texto.';

const DEFAULT_VIDEO_DISABLED_MESSAGE =
  'Desculpe, não consigo processar vídeos no momento. Por favor, descreva o conteúdo em texto.';

/**
 * Normaliza qualquer tipo de mensagem recebida (texto, áudio, imagem, vídeo)
 * para a estrutura unificada `NormalizedAgentPrompt`.
 *
 * O agente de IA sempre recebe a mesma interface independente do canal.
 */
@Injectable()
export class MessageNormalizerService {
  private readonly logger = new Logger(MessageNormalizerService.name);

  constructor(
    @Inject(MEDIA_PROCESSOR_PORT)
    private readonly mediaProcessor: MediaProcessorPort,
  ) {}

  async normalize(
    message: IncomingMessage,
    agent: AgentWithConfigsData,
  ): Promise<NormalizedAgentPrompt> {
    const context = this.buildContext(message, agent.id);

    switch (message.type) {
      case MessageType.TEXT:
        return this.normalizeText(message as TextIncomingMessage, context);

      case MessageType.AUDIO:
        return this.normalizeAudio(message as AudioIncomingMessage, context, agent);

      case MessageType.IMAGE:
        return this.normalizeImage(message as ImageIncomingMessage, context, agent);

      case MessageType.VIDEO:
        return this.normalizeVideo(message as VideoIncomingMessage, context, agent);

      default:
        return {
          userMessage: '[Mensagem de tipo não suportado recebida]',
          triggerText: '',
          originalMessageType: message.type,
          context,
        };
    }
  }

  // ─── Normalizadores por tipo ────────────────────────────────────────────────

  private normalizeText(
    message: TextIncomingMessage,
    context: AgentMessageContext,
  ): NormalizedAgentPrompt {
    return {
      userMessage: message.text,
      triggerText: message.text,
      originalMessageType: MessageType.TEXT,
      context,
    };
  }

  private async normalizeAudio(
    message: AudioIncomingMessage,
    context: AgentMessageContext,
    agent: AgentWithConfigsData,
  ): Promise<NormalizedAgentPrompt> {
    const mediaConfig = agent.mediaConfig;

    if (mediaConfig && !mediaConfig.audioEnabled) {
      const fallback = mediaConfig.audioDefaultMessage ?? DEFAULT_AUDIO_DISABLED_MESSAGE;
      this.logger.log(`Áudio desabilitado para agente ${agent.id}, usando mensagem padrão.`);
      return {
        userMessage: fallback,
        triggerText: '',
        originalMessageType: MessageType.AUDIO,
        context,
      };
    }

    if (!message.mediaUrl) {
      return {
        userMessage: '[Áudio recebido, mas URL de download não disponível]',
        triggerText: '',
        originalMessageType: MessageType.AUDIO,
        context,
      };
    }

    try {
      this.logger.log(`Baixando áudio para transcrição: ${message.mediaUrl}`);
      const audioBuffer = await this.downloadMedia(message.mediaUrl);
      const filename = this.resolveAudioFilename(message.mimeType);
      const transcription = await this.mediaProcessor.transcribeAudio(
        audioBuffer,
        message.mimeType,
        filename,
      );

      const userMessage = ['[Transcrição de áudio]', transcription].join('\n');

      return {
        userMessage,
        triggerText: transcription,
        originalMessageType: MessageType.AUDIO,
        context,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao transcrever áudio: ${error}`);
      return {
        userMessage: '[Áudio recebido, mas não foi possível realizar a transcrição]',
        triggerText: '',
        originalMessageType: MessageType.AUDIO,
        context,
      };
    }
  }

  private async normalizeImage(
    message: ImageIncomingMessage,
    context: AgentMessageContext,
    agent: AgentWithConfigsData,
  ): Promise<NormalizedAgentPrompt> {
    const mediaConfig = agent.mediaConfig;

    if (mediaConfig && !mediaConfig.imageEnabled) {
      const fallback = mediaConfig.imageDefaultMessage ?? DEFAULT_IMAGE_DISABLED_MESSAGE;
      this.logger.log(`Imagem desabilitada para agente ${agent.id}, usando mensagem padrão.`);
      return {
        userMessage: fallback,
        triggerText: message.caption ?? '',
        originalMessageType: MessageType.IMAGE,
        context,
      };
    }

    const extractionPrompt =
      mediaConfig?.imageExtractionPrompt ?? DEFAULT_IMAGE_EXTRACTION_PROMPT;

    try {
      const imageBase64 = await this.resolveImageBase64(message);
      const extracted = await this.mediaProcessor.interpretImage(
        imageBase64,
        message.mimeType,
        extractionPrompt,
      );

      const parts: string[] = ['[Imagem recebida]'];
      if (message.caption) parts.push(`Legenda: ${message.caption}`);
      parts.push(`Conteúdo da imagem:\n${extracted}`);

      return {
        userMessage: parts.join('\n'),
        triggerText: message.caption ?? '',
        originalMessageType: MessageType.IMAGE,
        context,
      };
    } catch (err) {
      const error = err instanceof Error ? err.message : String(err);
      this.logger.error(`Falha ao interpretar imagem: ${error}`);

      const fallback = message.caption
        ? `[Imagem recebida] Legenda: ${message.caption}`
        : '[Imagem recebida, mas não foi possível interpretar o conteúdo]';

      return {
        userMessage: fallback,
        triggerText: message.caption ?? '',
        originalMessageType: MessageType.IMAGE,
        context,
      };
    }
  }

  private async normalizeVideo(
    message: VideoIncomingMessage,
    context: AgentMessageContext,
    agent: AgentWithConfigsData,
  ): Promise<NormalizedAgentPrompt> {
    const mediaConfig = agent.mediaConfig;

    if (mediaConfig && !mediaConfig.videoEnabled) {
      const fallback = mediaConfig.videoDefaultMessage ?? DEFAULT_VIDEO_DISABLED_MESSAGE;
      this.logger.log(`Vídeo desabilitado para agente ${agent.id}, usando mensagem padrão.`);
      return {
        userMessage: fallback,
        triggerText: message.caption ?? '',
        originalMessageType: MessageType.VIDEO,
        context,
      };
    }

    const extractionPrompt =
      mediaConfig?.videoExtractionPrompt ?? DEFAULT_VIDEO_EXTRACTION_PROMPT;

    // Prioriza o thumbnail JPEG fornecido pelo WhatsApp via UAZAPI (mais rápido)
    if (message.thumbnailBase64) {
      try {
        const extracted = await this.mediaProcessor.interpretImage(
          message.thumbnailBase64,
          'image/jpeg',
          extractionPrompt,
        );

        const parts: string[] = ['[Vídeo recebido]'];
        if (message.caption) parts.push(`Legenda: ${message.caption}`);
        if (message.durationSeconds) parts.push(`Duração: ${message.durationSeconds}s`);
        parts.push(`Conteúdo do vídeo (análise do frame):\n${extracted}`);

        return {
          userMessage: parts.join('\n'),
          triggerText: message.caption ?? '',
          originalMessageType: MessageType.VIDEO,
          context,
        };
      } catch (err) {
        const error = err instanceof Error ? err.message : String(err);
        this.logger.error(`Falha ao interpretar thumbnail do vídeo: ${error}`);
      }
    }

    // Fallback: descrever com base nos metadados
    const parts: string[] = ['[Vídeo recebido]'];
    if (message.caption) parts.push(`Legenda: ${message.caption}`);
    if (message.durationSeconds) parts.push(`Duração: ${message.durationSeconds}s`);

    return {
      userMessage: parts.join('\n'),
      triggerText: message.caption ?? '',
      originalMessageType: MessageType.VIDEO,
      context,
    };
  }

  // ─── Helpers ────────────────────────────────────────────────────────────────

  private buildContext(message: IncomingMessage, agentId: string): AgentMessageContext {
    return {
      webhookEventId: message.webhookEventId,
      companyId: message.companyId,
      agentId,
      senderPhone: message.senderPhone,
      senderName: message.senderName,
      chatId: message.chatId,
      instanceName: message.instanceName,
      timestamp: message.timestamp,
      isGroup: message.isGroup,
      groupName: message.groupName,
    };
  }

  private async resolveImageBase64(message: ImageIncomingMessage): Promise<string> {
    // Se tiver thumbnail e não tiver URL completa, usa o thumbnail
    if (!message.mediaUrl && message.thumbnailBase64) {
      return message.thumbnailBase64;
    }

    // Baixa a imagem completa e converte para base64
    const buffer = await this.downloadMedia(message.mediaUrl);
    return buffer.toString('base64');
  }

  /**
   * Baixa o arquivo de mídia a partir da URL fornecida pelo UAZAPI.
   * Usa o UAZAPI_API_KEY como header de autorização se configurado.
   */
  private async downloadMedia(url: string): Promise<Buffer> {
    const headers: Record<string, string> = {};

    const apiKey = process.env.UAZAPI_API_KEY;
    if (apiKey) {
      headers['token'] = apiKey;
    }

    const response = await fetch(url, { headers });

    if (!response.ok) {
      throw new Error(
        `Falha ao baixar mídia: HTTP ${response.status} (${response.statusText}) - ${url}`,
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  }

  private resolveAudioFilename(mimeType: string): string {
    if (mimeType.includes('ogg')) return 'audio.ogg';
    if (mimeType.includes('mp4')) return 'audio.mp4';
    if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return 'audio.mp3';
    if (mimeType.includes('wav')) return 'audio.wav';
    if (mimeType.includes('webm')) return 'audio.webm';
    return 'audio.ogg';
  }
}
