import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

/**
 * Gerencia o período de espera do agente quando um atendente humano
 * intervém numa conversa.
 *
 * Quando o atendente digita uma mensagem manualmente no dispositivo
 * (fromMe=true, wasSentByApi=false), o agente é colocado em espera
 * por HUMAN_TAKEOVER_TIMEOUT_MS (padrão: 10 minutos) para aquele chatId.
 * Durante esse período todas as mensagens do cliente são ignoradas pelo bot.
 *
 * A expiração é gerenciada automaticamente pelo TTL do Redis —
 * não há necessidade de limpeza manual.
 */
@Injectable()
export class HumanTakeoverService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanTakeoverService.name);
  private redis!: IORedis;

  /** Tempo de espera em segundos (padrão: 600 = 10 minutos). */
  private readonly timeoutSeconds: number;

  constructor(private readonly configService: ConfigService) {
    const ms = this.configService.get<number>('HUMAN_TAKEOVER_TIMEOUT_MS', 10 * 60 * 1000);
    this.timeoutSeconds = Math.ceil(ms / 1000);
  }

  onModuleInit(): void {
    this.redis = new IORedis(this.configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.logger.log('[Takeover] Conexão Redis inicializada');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  /**
   * Ativa o período de espera do agente para o par (agentId, chatId).
   * O TTL é renovado a cada nova mensagem do atendente —
   * ou seja, enquanto o atendente continua digitando, o prazo se reinicia.
   */
  async setTakeover(agentId: string, chatId: string): Promise<void> {
    const key = this.buildKey(agentId, chatId);
    await this.redis.set(key, '1', 'EX', this.timeoutSeconds);
    this.logger.log(
      `[Takeover] Agente em espera | agentId=${agentId} | chatId=${chatId} | por=${this.timeoutSeconds}s`,
    );
  }

  /**
   * Retorna true se o agente ainda está em período de espera para
   * o par (agentId, chatId) — ou seja, a chave Redis ainda existe.
   */
  async isInTakeover(agentId: string, chatId: string): Promise<boolean> {
    const key = this.buildKey(agentId, chatId);
    const result = await this.redis.exists(key);
    return result === 1;
  }

  private buildKey(agentId: string, chatId: string): string {
    return `human-takeover:${agentId}:${chatId}`;
  }
}
