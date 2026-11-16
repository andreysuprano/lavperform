import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import IORedis from 'ioredis';

const PENDING_TTL_SECONDS = 900;

export function shouldPauseForPresence(input: {
  isFromMe: boolean;
  state?: string | null;
  media?: string | null;
}): boolean {
  if (!input.isFromMe) return false;

  const state = (input.state ?? '').trim().toLowerCase();
  if (state === 'paused') return false;
  if (state === 'composing' || state === 'recording') return true;

  const media = (input.media ?? '').trim().toLowerCase();
  return media === 'audio';
}

@Injectable()
export class HumanTypingPauseService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(HumanTypingPauseService.name);
  private redis!: IORedis;
  readonly pauseMs: number;
  private readonly pauseSeconds: number;

  constructor(private readonly configService: ConfigService) {
    this.pauseMs = this.configService.get<number>('HUMAN_TYPING_PAUSE_MS', 120000);
    this.pauseSeconds = Math.ceil(this.pauseMs / 1000);
  }

  onModuleInit(): void {
    this.redis = new IORedis(this.configService.getOrThrow<string>('REDIS_URL'), {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });
    this.logger.log('[TypingPause] Conexão Redis inicializada');
  }

  async onModuleDestroy(): Promise<void> {
    await this.redis.quit();
  }

  shouldPauseForPresence(input: {
    isFromMe: boolean;
    state?: string | null;
    media?: string | null;
  }): boolean {
    return shouldPauseForPresence(input);
  }

  async refresh(agentId: string, chatId: string): Promise<void> {
    await this.redis.set(this.pauseKey(agentId, chatId), '1', 'EX', this.pauseSeconds);
    const pending = await this.getPending(agentId, chatId);
    if (pending) {
      await this.redis.expire(this.pendingKey(agentId, chatId), PENDING_TTL_SECONDS);
    }
  }

  async isPaused(agentId: string, chatId: string): Promise<boolean> {
    const result = await this.redis.exists(this.pauseKey(agentId, chatId));
    return result === 1;
  }

  async remainingMs(agentId: string, chatId: string): Promise<number> {
    const ttl = await this.redis.pttl(this.pauseKey(agentId, chatId));
    return ttl < 1 ? 0 : ttl;
  }

  async clear(agentId: string, chatId: string): Promise<void> {
    await this.redis.del(this.pauseKey(agentId, chatId));
  }

  async setPending(agentId: string, chatId: string, conversationId: string): Promise<void> {
    await this.redis.set(
      this.pendingKey(agentId, chatId),
      conversationId,
      'EX',
      PENDING_TTL_SECONDS,
    );
  }

  async getPending(agentId: string, chatId: string): Promise<string | null> {
    return this.redis.get(this.pendingKey(agentId, chatId));
  }

  async clearPending(agentId: string, chatId: string): Promise<void> {
    await this.redis.del(this.pendingKey(agentId, chatId));
  }

  async clearAll(agentId: string, chatId: string): Promise<void> {
    await this.redis.del(this.pauseKey(agentId, chatId));
    await this.redis.del(this.pendingKey(agentId, chatId));
  }

  async touchPending(agentId: string, chatId: string): Promise<void> {
    const key = this.pendingKey(agentId, chatId);
    const exists = await this.redis.exists(key);
    if (exists === 1) {
      await this.redis.expire(key, PENDING_TTL_SECONDS);
    }
  }

  private pauseKey(agentId: string, chatId: string): string {
    return `human-typing:${agentId}:${chatId}`;
  }

  private pendingKey(agentId: string, chatId: string): string {
    return `human-typing-pending:${agentId}:${chatId}`;
  }
}
