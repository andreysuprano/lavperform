import { Injectable } from '@nestjs/common';
import { RedisService } from '../../common/redis/redis.service';
import { AdminOverviewResponseDto } from './dto/admin-overview-response.dto';
import { AdminOverviewRepository } from './admin-overview.repository';

export const ADMIN_OVERVIEW_CACHE_KEY = 'admin:overview:v1';
export const ADMIN_OVERVIEW_CACHE_TTL_SECONDS = 7200;

type CachedOverviewPayload = Omit<AdminOverviewResponseDto, 'fromCache'>;

@Injectable()
export class AdminOverviewService {
  constructor(
    private readonly repository: AdminOverviewRepository,
    private readonly redis: RedisService,
  ) {}

  async getOverview(): Promise<AdminOverviewResponseDto> {
    const cached = await this.redis.getJson<CachedOverviewPayload>(
      ADMIN_OVERVIEW_CACHE_KEY,
    );

    if (cached) {
      return { ...cached, fromCache: true };
    }

    return this.computeAndCache();
  }

  async refreshOverview(): Promise<AdminOverviewResponseDto> {
    await this.redis.del(ADMIN_OVERVIEW_CACHE_KEY);
    return this.computeAndCache();
  }

  private async computeAndCache(): Promise<AdminOverviewResponseDto> {
    const metrics = await this.repository.fetchMetrics();
    const computedAt = new Date().toISOString();

    const payload: CachedOverviewPayload = {
      ...metrics,
      computedAt,
    };

    await this.redis.setJson(
      ADMIN_OVERVIEW_CACHE_KEY,
      payload,
      ADMIN_OVERVIEW_CACHE_TTL_SECONDS,
    );

    return { ...payload, fromCache: false };
  }
}
