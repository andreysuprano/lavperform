import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import IORedis from 'ioredis';
import { WEBHOOK_QUEUE_NAME } from '../../../infrastructure/queue/webhook-queue.constants';

export const BUFFER_JOB_NAME = 'process-buffer' as const;

export interface BufferJobData {
  agentId: string;
  chatId: string;
  bufferKey: string;
}

/**
 * Agrupa mensagens consecutivas do mesmo chat antes de processar.
 *
 * Quando uma mensagem chega, ela é armazenada numa lista Redis e um job
 * BullMQ com delay é criado (ou substituído). Se outra mensagem chegar do
 * mesmo chat antes do delay expirar, o timer é reiniciado e a nova mensagem
 * é acrescentada ao lote. Quando o delay finalmente expira, o worker recebe
 * todas as mensagens acumuladas e as processa como uma única requisição ao LLM.
 */
@Injectable()
export class MessageBufferService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(MessageBufferService.name);
  private redis!: IORedis;

  constructor(
    @InjectQueue(WEBHOOK_QUEUE_NAME) private readonly queue: Queue,
    private readonly configService: ConfigService,
  ) {}

  onModuleInit(): void {
    this.redis = new IORedis(this.configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.logger.log('[Buffer] Conexão Redis inicializada');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Adiciona um webhookEventId ao buffer daquele chat e reinicia o timer.
   * Retorna o jobId do job de processamento agendado.
   */
  async addToBuffer(
    webhookEventId: string,
    agentId: string,
    chatId: string,
  ): Promise<string> {
    const bufferKey = this.buildBufferKey(agentId, chatId);
    const jobId = this.buildJobId(agentId, chatId);
    const timeoutMs = this.configService.get<number>('MESSAGE_BUFFER_TIMEOUT_MS', 3000);

    // Appenda o ID ao fim da lista Redis
    await this.redis.rpush(bufferKey, webhookEventId);
    // TTL de segurança: timeout + 2 minutos para evitar vazamento em caso de falha
    await this.redis.expire(bufferKey, Math.ceil(timeoutMs / 1000) + 120);

    // Cancela o job anterior para reiniciar o timer
    try {
      const existingJob = await this.queue.getJob(jobId);
      if (existingJob) {
        await existingJob.remove();
        this.logger.debug(`[Buffer] Timer reiniciado | chatId=${chatId}`);
      }
    } catch {
      // Job pode já ter sido consumido; sem problema
    }

    // Agenda novo job com o delay completo
    const job = await this.queue.add(
      BUFFER_JOB_NAME,
      { agentId, chatId, bufferKey } satisfies BufferJobData,
      {
        jobId,
        delay: timeoutMs,
        removeOnComplete: 100,
        removeOnFail: 500,
      },
    );

    this.logger.log(
      `[Buffer] Evento enfileirado | agentId=${agentId} | chatId=${chatId} | webhookEventId=${webhookEventId} | delay=${timeoutMs}ms`,
    );

    return String(job.id);
  }

  /**
   * Consome atomicamente todos os IDs do buffer e limpa a chave Redis.
   * Retorna lista vazia se o buffer já foi consumido (race condition segura).
   */
  async popBuffer(bufferKey: string): Promise<string[]> {
    const pipe = this.redis.pipeline();
    pipe.lrange(bufferKey, 0, -1);
    pipe.del(bufferKey);
    const results = await pipe.exec();
    return (results?.[0]?.[1] as string[] | null) ?? [];
  }

  private buildBufferKey(agentId: string, chatId: string): string {
    return `msg-buffer:${agentId}:${chatId}`;
  }

  private buildJobId(agentId: string, chatId: string): string {
    return `buffer:${agentId}:${chatId}`;
  }
}
