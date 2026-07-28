import { Inject, Injectable, Logger, NotFoundException } from '@nestjs/common';
import {
  AUDIO_MESSAGE_HANDLER,
  IMAGE_MESSAGE_HANDLER,
  TEXT_MESSAGE_HANDLER,
  VIDEO_MESSAGE_HANDLER,
} from '../handlers/message-handler.port';
import type { MessageHandlerPort } from '../handlers/message-handler.port';
import { WEBHOOK_PROVIDER_PORT } from '../ports/webhook-provider.port';
import type { WebhookProviderPort } from '../ports/webhook-provider.port';
import { WEBHOOK_EVENT_REPOSITORY } from '../ports/webhook-event.repository.port';
import type { WebhookEventRepositoryPort } from '../ports/webhook-event.repository.port';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { MessageType } from '../types/incoming-message.types';
import type { TextIncomingMessage } from '../types/incoming-message.types';

@Injectable()
export class ProcessWebhookJobUseCase {
  private readonly logger = new Logger(ProcessWebhookJobUseCase.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly repository: WebhookEventRepositoryPort,
    @Inject(WEBHOOK_PROVIDER_PORT)
    private readonly provider: WebhookProviderPort,
    @Inject(AGENT_REPOSITORY)
    private readonly agentRepository: AgentRepositoryPort,
    @Inject(TEXT_MESSAGE_HANDLER)
    private readonly textHandler: MessageHandlerPort,
    @Inject(AUDIO_MESSAGE_HANDLER)
    private readonly audioHandler: MessageHandlerPort,
    @Inject(IMAGE_MESSAGE_HANDLER)
    private readonly imageHandler: MessageHandlerPort,
    @Inject(VIDEO_MESSAGE_HANDLER)
    private readonly videoHandler: MessageHandlerPort,
  ) {}

  /** Processa um único evento (mídias e casos imediatos). */
  async execute(webhookEventId: string, agentId: string): Promise<void> {
    await this.repository.markAsProcessing(webhookEventId);

    try {
      const event = await this.repository.findById(webhookEventId);
      if (!event) {
        throw new NotFoundException(`WebhookEvent ${webhookEventId} não encontrado.`);
      }

      const agent = await this.agentRepository.findById(agentId);
      if (!agent) {
        throw new NotFoundException(`Agente ${agentId} não encontrado ou inativo.`);
      }
      if (!agent.active) {
        this.logger.warn(`Agente ${agentId} está inativo — evento ${webhookEventId} ignorado.`);
        await this.repository.markAsCompleted(webhookEventId);
        return;
      }

      const companyId = event.companyId ?? '';
      const message = this.provider.parse(event.rawPayload, webhookEventId, companyId);

      this.logger.log(
        `Roteando evento ${webhookEventId} | tipo=${message.type} | agent=${agentId} | company=${companyId}`,
      );

      switch (message.type) {
        case MessageType.TEXT:
          await this.textHandler.handle(message, agent);
          break;
        case MessageType.AUDIO:
          await this.audioHandler.handle(message, agent);
          break;
        case MessageType.IMAGE:
          await this.imageHandler.handle(message, agent);
          break;
        case MessageType.VIDEO:
          await this.videoHandler.handle(message, agent);
          break;
        default:
          this.logger.warn(
            `Tipo de mensagem não suportado: ${String(message.type)} (evento=${webhookEventId})`,
          );
      }

      await this.repository.markAsCompleted(webhookEventId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`Falha ao processar evento ${webhookEventId}: ${errorMessage}`);
      await this.repository.markAsFailed(webhookEventId, errorMessage);
      throw error;
    }
  }

  /**
   * Processa um lote de eventos de texto vindos do buffer.
   *
   * Todos os textos são concatenados (separados por "\n") e tratados como
   * uma única mensagem para o LLM, usando o contexto do primeiro evento como base.
   */
  async executeBatch(webhookEventIds: string[], agentId: string): Promise<void> {
    if (webhookEventIds.length === 0) return;

    // Lote com um único item: cai no fluxo normal para evitar reprocessamento
    if (webhookEventIds.length === 1) {
      return this.execute(webhookEventIds[0], agentId);
    }

    this.logger.log(
      `[Batch] Processando lote | agentId=${agentId} | quantidade=${webhookEventIds.length} | ids=${webhookEventIds.join(',')}`,
    );

    // Marca todos como "em processamento" de uma vez
    await Promise.all(webhookEventIds.map((id) => this.repository.markAsProcessing(id)));

    try {
      const agent = await this.agentRepository.findById(agentId);
      if (!agent) {
        throw new NotFoundException(`Agente ${agentId} não encontrado.`);
      }
      if (!agent.active) {
        this.logger.warn(`Agente ${agentId} está inativo — lote ignorado.`);
        await Promise.all(webhookEventIds.map((id) => this.repository.markAsCompleted(id)));
        return;
      }

      // Carrega todos os eventos em paralelo
      const eventResults = await Promise.all(
        webhookEventIds.map((id) => this.repository.findById(id)),
      );
      const events = eventResults.filter((e): e is NonNullable<typeof e> => e !== null);

      if (events.length === 0) {
        this.logger.warn('[Batch] Nenhum evento encontrado no banco para o lote.');
        await Promise.all(webhookEventIds.map((id) => this.repository.markAsCompleted(id)));
        return;
      }

      const companyId = events[0].companyId ?? '';

      // Faz o parse de cada evento
      const messages = events.map((event) =>
        this.provider.parse(event.rawPayload, event.id, companyId),
      );

      // Separa mensagens de texto das demais
      const textMessages = messages.filter(
        (m): m is TextIncomingMessage => m.type === MessageType.TEXT,
      );

      if (textMessages.length === 0) {
        this.logger.warn('[Batch] Lote sem mensagens de texto; ignorando.');
        await Promise.all(webhookEventIds.map((id) => this.repository.markAsCompleted(id)));
        return;
      }

      // Concatena os textos em ordem de chegada
      const concatenatedText = textMessages.map((m) => m.text).join('\n');

      // Monta uma única mensagem unificada usando o contexto do primeiro evento
      const mergedMessage: TextIncomingMessage = {
        ...textMessages[0],
        // Representa o lote pelo ID do último evento (o mais recente)
        webhookEventId: webhookEventIds[webhookEventIds.length - 1],
        text: concatenatedText,
      };

      this.logger.log(
        `[Batch] Mensagem unificada | tamanho=${concatenatedText.length}chars | sender=${mergedMessage.senderPhone}`,
      );

      await this.textHandler.handle(mergedMessage, agent);

      await Promise.all(webhookEventIds.map((id) => this.repository.markAsCompleted(id)));
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(`[Batch] Falha ao processar lote: ${errorMessage}`);
      await Promise.all(
        webhookEventIds.map((id) => this.repository.markAsFailed(id, errorMessage)),
      );
      throw error;
    }
  }
}
