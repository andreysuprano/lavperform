import { Inject, Injectable, Logger } from '@nestjs/common';
import { AGENT_REPOSITORY } from '../../agent/ports/agent.repository.port';
import type { AgentRepositoryPort } from '../../agent/ports/agent.repository.port';
import { WEBHOOK_EVENT_REPOSITORY } from '../ports/webhook-event.repository.port';
import type { WebhookEventRepositoryPort } from '../ports/webhook-event.repository.port';
import { WEBHOOK_PROVIDER_PORT } from '../ports/webhook-provider.port';
import type { WebhookProviderPort } from '../ports/webhook-provider.port';
import { WEBHOOK_QUEUE_PORT } from '../ports/webhook-queue.port';
import type { WebhookQueuePort } from '../ports/webhook-queue.port';
import { MessageBufferService } from '../services/message-buffer.service';
import { WaitingAckService } from '../services/waiting-ack.service';
import { MessageType } from '../types/incoming-message.types';

@Injectable()
export class ReceiveWebhookUseCase {
  private readonly logger = new Logger(ReceiveWebhookUseCase.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly repository: WebhookEventRepositoryPort,
    @Inject(WEBHOOK_QUEUE_PORT)
    private readonly queue: WebhookQueuePort,
    private readonly messageBuffer: MessageBufferService,
    @Inject(AGENT_REPOSITORY)
    private readonly agents: AgentRepositoryPort,
    @Inject(WEBHOOK_PROVIDER_PORT)
    private readonly provider: WebhookProviderPort,
    private readonly waitingAck: WaitingAckService,
  ) {}

  async execute(
    rawPayload: string,
    companyId: string,
    agentId: string,
  ): Promise<{ jobId: string; webhookEventId: string }> {
    this.logger.log(`[ReceiveWebhook] Persistindo evento | companyId=${companyId} | agentId=${agentId}`);

    const { id: webhookEventId } = await this.repository.save(rawPayload, companyId, agentId);
    this.logger.log(`[ReceiveWebhook] Evento salvo no banco | webhookEventId=${webhookEventId}`);

    await this.sendWaitingAck(rawPayload, webhookEventId, companyId, agentId);

    const { bufferText, chatId } = this.parseMinimal(rawPayload);

    let jobId: string;
    if (bufferText && chatId) {
      // Texto do cliente ou do aparelho humano entra no buffer.
      // Eco da API (wasSentByApi) segue direto para a fila.
      jobId = await this.messageBuffer.addToBuffer(webhookEventId, agentId, chatId);
      this.logger.log(
        `[ReceiveWebhook] Evento adicionado ao buffer | webhookEventId=${webhookEventId} | chatId=${chatId}`,
      );
    } else {
      // Áudio, imagem, vídeo, eco da API e tipos desconhecidos são processados imediatamente
      jobId = await this.queue.enqueue(webhookEventId, agentId);
      this.logger.log(
        `[ReceiveWebhook] Job enfileirado diretamente | jobId=${jobId} | webhookEventId=${webhookEventId}`,
      );
    }

    return { jobId, webhookEventId };
  }

  /**
   * Saudação imediata para texto, imagem e vídeo.
   * Áudio espera a transcrição. Falha aqui não impede o buffer nem a fila.
   */
  private async sendWaitingAck(
    rawPayload: string,
    webhookEventId: string,
    companyId: string,
    agentId: string,
  ): Promise<void> {
    try {
      const agent = await this.agents.findById(agentId);
      if (!agent) return;

      const message = this.provider.parse(rawPayload, webhookEventId, companyId);
      if (
        message.type !== MessageType.TEXT &&
        message.type !== MessageType.IMAGE &&
        message.type !== MessageType.VIDEO
      ) {
        return;
      }

      await this.waitingAck.maybeSend(message, agent, {
        dedupe: message.type === MessageType.TEXT,
      });
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `[ReceiveWebhook] Saudação de espera ignorada | agentId=${agentId} | ${msg}`,
      );
    }
  }

  /**
   * Extrai o que decide o buffer sem acoplar esta camada a um provider.
   * Texto com wasSentByApi não entra no lote: a fila deixa o filtro descartar o eco.
   */
  private parseMinimal(rawPayload: string): { bufferText: boolean; chatId: string } {
    try {
      const body = JSON.parse(rawPayload) as Record<string, unknown>;
      const message = body.message as Record<string, unknown> | undefined;
      const sentByApi = message?.wasSentByApi === true;
      return {
        bufferText: message?.type === 'text' && !sentByApi,
        chatId: (message?.chatid as string | undefined) ?? '',
      };
    } catch {
      return { bufferText: false, chatId: '' };
    }
  }
}
