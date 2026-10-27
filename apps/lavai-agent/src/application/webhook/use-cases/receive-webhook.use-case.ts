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
import {
  MessageType,
  type IncomingMessage,
} from '../types/incoming-message.types';

/** Só a saudação deste webhook espera no máximo isto. O envio UAZAPI em si não ganha timeout. */
const WAITING_ACK_WEBHOOK_TIMEOUT_MS = 5000;

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

    const message = this.parseIncoming(rawPayload, webhookEventId, companyId, agentId);
    const { bufferText, chatId } = this.parseMinimal(rawPayload);

    if (bufferText && chatId) {
      // Texto do cliente: a saudação dispara sem ser aguardada. O buffer de 3s
      // mantém a frase na frente da resposta do modelo, e um provedor lento não segura o webhook.
      void this.sendWaitingAck(message, agentId).catch((error: unknown) => {
        this.logWaitingAckError(agentId, error);
      });
      const jobId = await this.messageBuffer.addToBuffer(webhookEventId, agentId, chatId);
      this.logger.log(
        `[ReceiveWebhook] Evento adicionado ao buffer | webhookEventId=${webhookEventId} | chatId=${chatId}`,
      );
      return { jobId, webhookEventId };
    }

    if (
      message &&
      (message.type === MessageType.IMAGE || message.type === MessageType.VIDEO)
    ) {
      await this.sendWaitingAckWithinTimeout(message, agentId);
    }

    // Áudio, eco da API, texto do aparelho e tipos desconhecidos seguem direto.
    // Áudio espera a transcrição no handler — não é saudado aqui.
    const jobId = await this.queue.enqueue(webhookEventId, agentId);
    this.logger.log(
      `[ReceiveWebhook] Job enfileirado diretamente | jobId=${jobId} | webhookEventId=${webhookEventId}`,
    );

    return { jobId, webhookEventId };
  }

  /**
   * Interpreta o payload antes de buscar o agente.
   * Falha aqui não rejeita o webhook: a mensagem segue para o buffer ou a fila.
   */
  private parseIncoming(
    rawPayload: string,
    webhookEventId: string,
    companyId: string,
    agentId: string,
  ): IncomingMessage | undefined {
    try {
      return this.provider.parse(rawPayload, webhookEventId, companyId);
    } catch (error) {
      this.logWaitingAckError(agentId, error);
      return undefined;
    }
  }

  /**
   * Saudação para texto, imagem e vídeo do cliente.
   * fromMe, eco da API e os demais tipos (áudio inclusive) não buscam o agente nem enviam.
   */
  private async sendWaitingAck(
    message: IncomingMessage | undefined,
    agentId: string,
  ): Promise<void> {
    if (
      !message ||
      message.isFromMe ||
      message.wasSentByApi ||
      (message.type !== MessageType.TEXT &&
        message.type !== MessageType.IMAGE &&
        message.type !== MessageType.VIDEO)
    ) {
      return;
    }

    const agent = await this.agents.findById(agentId);
    if (!agent) return;

    await this.waitingAck.maybeSend(message, agent, {
      dedupe: message.type === MessageType.TEXT,
    });
  }

  /**
   * Imagem e vídeo esperam a saudação, no máximo 5s, para ela sair antes do job.
   * Timeout ou falha apenas registram o log e deixam o enfileiramento seguir.
   */
  private async sendWaitingAckWithinTimeout(
    message: IncomingMessage,
    agentId: string,
  ): Promise<void> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const timeout = new Promise<void>((resolve) => {
      timer = setTimeout(() => {
        this.logger.error(
          `[ReceiveWebhook] Saudação de espera excedeu 5s | agentId=${agentId}`,
        );
        resolve();
      }, WAITING_ACK_WEBHOOK_TIMEOUT_MS);
    });

    const ack = this.sendWaitingAck(message, agentId).catch((error: unknown) => {
      this.logWaitingAckError(agentId, error);
    });

    try {
      await Promise.race([ack, timeout]);
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  private logWaitingAckError(agentId: string, error: unknown): void {
    const msg = error instanceof Error ? error.message : String(error);
    this.logger.error(
      `[ReceiveWebhook] Saudação de espera ignorada | agentId=${agentId} | ${msg}`,
    );
  }

  /**
   * Extrai o que decide o buffer sem acoplar esta camada a um provider.
   * Texto do aparelho (fromMe) e eco da API (wasSentByApi) não entram no lote.
   */
  private parseMinimal(rawPayload: string): { bufferText: boolean; chatId: string } {
    try {
      const body = JSON.parse(rawPayload) as Record<string, unknown>;
      const message = body.message as Record<string, unknown> | undefined;
      const sentByApi = message?.wasSentByApi === true;
      const fromMe = message?.fromMe === true;
      return {
        bufferText: message?.type === 'text' && !sentByApi && !fromMe,
        chatId: (message?.chatid as string | undefined) ?? '',
      };
    } catch {
      return { bufferText: false, chatId: '' };
    }
  }
}
