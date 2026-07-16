import {
  ADMIN_OVERVIEW_CACHE_KEY,
  ADMIN_OVERVIEW_CACHE_TTL_SECONDS,
  AdminOverviewService,
} from 'src/admin/overview/admin-overview.service';

describe('AdminOverviewService', () => {
  const repository = { fetchMetrics: jest.fn() };
  const redis = {
    getJson: jest.fn(),
    setJson: jest.fn(),
    del: jest.fn(),
  };

  let service: AdminOverviewService;

  const metrics = {
    companiesCount: 10,
    activeCampaignsCount: 5,
    customersCount: 1000,
    mrrCents: 99000,
    topupsPaidCents: 500000,
    incentivizedRevenue: 25000.5,
    incentivizedOrdersCount: 120,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new AdminOverviewService(repository as any, redis as any);
  });

  it('returns cached payload when Redis hit', async () => {
    const cached = {
      ...metrics,
      computedAt: '2026-05-22T10:00:00.000Z',
    };
    redis.getJson.mockResolvedValue(cached);

    const result = await service.getOverview();

    expect(result).toEqual({ ...cached, fromCache: true });
    expect(repository.fetchMetrics).not.toHaveBeenCalled();
    expect(redis.setJson).not.toHaveBeenCalled();
  });

  it('computes and caches on Redis miss', async () => {
    redis.getJson.mockResolvedValue(null);
    repository.fetchMetrics.mockResolvedValue(metrics);

    const result = await service.getOverview();

    expect(result.fromCache).toBe(false);
    expect(result.companiesCount).toBe(metrics.companiesCount);
    expect(result.computedAt).toBeDefined();
    expect(redis.setJson).toHaveBeenCalledWith(
      ADMIN_OVERVIEW_CACHE_KEY,
      expect.objectContaining({
        companiesCount: metrics.companiesCount,
        computedAt: result.computedAt,
      }),
      ADMIN_OVERVIEW_CACHE_TTL_SECONDS,
    );
    expect(repository.fetchMetrics).toHaveBeenCalledTimes(1);
  });

  it('refresh deletes cache and recomputes', async () => {
    repository.fetchMetrics.mockResolvedValue(metrics);

    const result = await service.refreshOverview();

    expect(redis.del).toHaveBeenCalledWith(ADMIN_OVERVIEW_CACHE_KEY);
    expect(result.fromCache).toBe(false);
    expect(repository.fetchMetrics).toHaveBeenCalledTimes(1);
    expect(redis.setJson).toHaveBeenCalled();
  });
});
