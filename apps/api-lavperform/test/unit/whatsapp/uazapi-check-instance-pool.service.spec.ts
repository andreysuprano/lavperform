import { UazapiCheckInstancePool } from 'src/whatsapp/uazapi/uazapi-check-instance-pool.service';
import { UazapiInstanceSummaryDto } from 'src/whatsapp/uazapi/application/dto/instance-list.dto';

function instance(
  overrides: Partial<UazapiInstanceSummaryDto>,
): UazapiInstanceSummaryDto {
  return {
    id: 'id',
    token: 'tok',
    name: 'name',
    status: 'connected',
    lastDisconnect: null,
    updated: '',
    created: '',
    ...overrides,
  };
}

describe('UazapiCheckInstancePool', () => {
  const uazapiClient = {
    getAllInstances: jest.fn(),
  };

  let pool: UazapiCheckInstancePool;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    pool = new UazapiCheckInstancePool(uazapiClient as any);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('ignores disconnected and pending instances', async () => {
    uazapiClient.getAllInstances.mockResolvedValue([
      instance({ name: 'a', token: 'tok-a', status: 'connected' }),
      instance({ name: 'b', token: 'tok-b', status: 'disconnected' }),
      instance({ name: 'c', token: 'tok-c', status: 'pending' }),
      instance({ name: 'd', token: 'tok-d', status: 'CONNECTED' }),
    ]);

    const connected = await pool.getConnectedInstances();

    expect(connected).toEqual([
      { name: 'a', token: 'tok-a' },
      { name: 'd', token: 'tok-d' },
    ]);
  });

  it('rotates indexes in round-robin A, B, C, A', () => {
    expect(pool.nextIndex(3)).toBe(0);
    expect(pool.nextIndex(3)).toBe(1);
    expect(pool.nextIndex(3)).toBe(2);
    expect(pool.nextIndex(3)).toBe(0);
  });

  it('gives distinct start indexes to concurrent jobs in the same tick', () => {
    expect(Array.from({ length: 5 }, () => pool.nextIndex(3))).toEqual([0, 1, 2, 0, 1]);
  });

  it('returns 0 when nextIndex length is not positive', () => {
    expect(pool.nextIndex(0)).toBe(0);
    expect(pool.nextIndex(-1)).toBe(0);
  });

  it('does not call getAllInstances twice within the TTL', async () => {
    uazapiClient.getAllInstances.mockResolvedValue([
      instance({ name: 'a', token: 'tok-a' }),
    ]);

    await pool.getConnectedInstances();
    await pool.getConnectedInstances();

    expect(uazapiClient.getAllInstances).toHaveBeenCalledTimes(1);
  });

  it('fetches again after the TTL expires', async () => {
    uazapiClient.getAllInstances
      .mockResolvedValueOnce([instance({ name: 'a', token: 'tok-a' })])
      .mockResolvedValueOnce([instance({ name: 'b', token: 'tok-b' })]);

    await pool.getConnectedInstances();
    jest.advanceTimersByTime(UazapiCheckInstancePool.CACHE_TTL_MS);
    const connected = await pool.getConnectedInstances();

    expect(uazapiClient.getAllInstances).toHaveBeenCalledTimes(2);
    expect(connected).toEqual([{ name: 'b', token: 'tok-b' }]);
  });

  it('fetches again after invalidate', async () => {
    uazapiClient.getAllInstances
      .mockResolvedValueOnce([instance({ name: 'a', token: 'tok-a' })])
      .mockResolvedValueOnce([instance({ name: 'b', token: 'tok-b' })]);

    await pool.getConnectedInstances();
    pool.invalidate();
    const connected = await pool.getConnectedInstances();

    expect(uazapiClient.getAllInstances).toHaveBeenCalledTimes(2);
    expect(connected).toEqual([{ name: 'b', token: 'tok-b' }]);
  });

  it('does not reset the cursor on invalidate', () => {
    expect(pool.nextIndex(3)).toBe(0);
    expect(pool.nextIndex(3)).toBe(1);
    pool.invalidate();
    expect(pool.nextIndex(3)).toBe(2);
  });

  it('shares an in-flight fetch across parallel callers', async () => {
    let resolveFetch: (value: UazapiInstanceSummaryDto[]) => void = () => undefined;
    uazapiClient.getAllInstances.mockImplementation(
      () =>
        new Promise<UazapiInstanceSummaryDto[]>((resolve) => {
          resolveFetch = resolve;
        }),
    );

    const first = pool.getConnectedInstances();
    const second = pool.getConnectedInstances();

    resolveFetch([instance({ name: 'a', token: 'tok-a' })]);

    const [firstResult, secondResult] = await Promise.all([first, second]);

    expect(uazapiClient.getAllInstances).toHaveBeenCalledTimes(1);
    expect(firstResult).toEqual([{ name: 'a', token: 'tok-a' }]);
    expect(secondResult).toEqual([{ name: 'a', token: 'tok-a' }]);
  });

  it('returns empty list when no instance is connected', async () => {
    uazapiClient.getAllInstances.mockResolvedValue([
      instance({ status: 'disconnected' }),
    ]);

    await expect(pool.getConnectedInstances()).resolves.toEqual([]);
  });

  it('retries getAllInstances after a failed in-flight fetch', async () => {
    uazapiClient.getAllInstances
      .mockRejectedValueOnce(new Error('uazapi down'))
      .mockResolvedValueOnce([instance({ name: 'a', token: 'tok-a' })]);

    await expect(pool.getConnectedInstances()).rejects.toThrow('uazapi down');
    await expect(pool.getConnectedInstances()).resolves.toEqual([
      { name: 'a', token: 'tok-a' },
    ]);
    expect(uazapiClient.getAllInstances).toHaveBeenCalledTimes(2);
  });
});
