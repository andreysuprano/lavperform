import Redis from 'ioredis';

export class RedisCleaner {
  constructor(private redis: Redis) {}

  async cleanAll(): Promise<void> {
    await this.redis.flushall();
    console.log('🧹 Redis cleaned');
  }

  async cleanPattern(pattern: string): Promise<void> {
    const keys = await this.redis.keys(pattern);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}
