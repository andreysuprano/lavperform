import { Inject, Injectable, Logger } from '@nestjs/common';
import { WEBHOOK_EVENT_REPOSITORY } from '../ports/webhook-event.repository.port';
import type { WebhookEventRepositoryPort } from '../ports/webhook-event.repository.port';
import { WEBHOOK_QUEUE_PORT } from '../ports/webhook-queue.port';
import type { WebhookQueuePort } from '../ports/webhook-queue.port';
import { MessageBufferService } from '../services/message-buffer.service';

@Injectable()
export class ReceiveWebhookUseCase {
  private readonly logger = new Logger(ReceiveWebhookUseCase.name);

  constructor(
    @Inject(WEBHOOK_EVENT_REPOSITORY)
    private readonly repository: WebhookEventRepositoryPort,
    @Inject(WEBHOOK_QUEUE_PORT)
    private readonly queue: WebhookQueuePort,
    private readonly messageBuffer: MessageBufferService,
  ) {}

  async execute(
    rawPayload: string,
    companyId: string,
    agentId: string,
  ): Promise<{ jobId: string; webhookEventId: string }> {
    this.logger.log(`[ReceiveWebhook] Persistindo evento | companyId=${companyId} | agentId=${agentId}`);

    const { id: webhookEventId } = await this.repository.save(rawPayload, companyId, agentId);
    this.logger.log(`[ReceiveWebhook] Evento salvo no banco | webhookEventId=${webhookEventId}`);

    const { isText, chatId } = this.parseMinimal(rawPayload);

    let jobId: string;
    if (isText && chatId) {
      // Mensagens de texto passam pelo buffer para agrupar envios rápidos consecutivos
      jobId = await this.messageBuffer.addToBuffer(webhookEventId, agentId, chatId);
      this.logger.log(
        `[ReceiveWebhook] Evento adicionado ao buffer | webhookEventId=${webhookEventId} | chatId=${chatId}`,
      );
    } else {
      // Áudio, imagem, vídeo e tipos desconhecidos são processados imediatamente
      jobId = await this.queue.enqueue(webhookEventId, agentId);
      this.logger.log(
        `[ReceiveWebhook] Job enfileirado diretamente | jobId=${jobId} | webhookEventId=${webhookEventId}`,
      );
    }

    return { jobId, webhookEventId };
  }

  /**
   * Extrai apenas o tipo e o chatId do payload bruto.
   * Evita acoplamento com um WebhookProviderPort específico nesta camada.
   */
  private parseMinimal(rawPayload: string): { isText: boolean; chatId: string } {
    try {
      const body = JSON.parse(rawPayload) as Record<string, unknown>;
      const message = body.message as Record<string, unknown> | undefined;
      return {
        isText: message?.type === 'text',
        chatId: (message?.chatid as string | undefined) ?? '',
      };
    } catch {
      return { isText: false, chatId: '' };
    }
  }
}
