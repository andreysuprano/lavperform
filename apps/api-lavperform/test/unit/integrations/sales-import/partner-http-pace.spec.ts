import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
  MAX_PARTNER_HTTP_DELAY_MS,
  isHttp429,
  parseRetryAfterMs,
  with429Retry,
} from 'src/integrations/sales-import/partner-http-pace';

describe('partner-http-pace', () => {
  it('usa 400ms como intervalo padrão', () => {
    expect(DEFAULT_PARTNER_HTTP_DELAY_MS).toBe(400);
  });

  it('lê Retry-After em segundos', () => {
    expect(parseRetryAfterMs('2', 60_000)).toBe(2000);
  });

  it('lê Retry-After em data HTTP', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T15:00:00.000Z'));
    expect(parseRetryAfterMs('Fri, 02 Oct 2026 15:00:02 GMT', 60_000)).toBe(
      2000,
    );
    jest.useRealTimers();
  });

  it('usa o fallback quando a data HTTP de Retry-After já passou', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T15:00:00.000Z'));
    expect(parseRetryAfterMs('Fri, 02 Oct 2026 14:00:00 GMT', 60_000)).toBe(
      60_000,
    );
    jest.useRealTimers();
  });

  it('segura o atraso entre 400 ms e 60 s', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-10-02T15:00:00.000Z'));
    expect(parseRetryAfterMs('0')).toBe(DEFAULT_PARTNER_HTTP_DELAY_MS);
    expect(parseRetryAfterMs('120')).toBe(MAX_PARTNER_HTTP_DELAY_MS);
    expect(parseRetryAfterMs('Fri, 02 Oct 2026 15:02:00 GMT')).toBe(
      MAX_PARTNER_HTTP_DELAY_MS,
    );
    expect(parseRetryAfterMs(undefined, 15 * 60 * 1000)).toBe(
      15 * 60 * 1000,
    );
    expect(parseRetryAfterMs('', 100)).toBe(100);
    jest.useRealTimers();
  });

  it('reconhece HTTP 429', () => {
    expect(isHttp429({ response: { status: 429 } })).toBe(true);
    expect(isHttp429({ response: { status: 500 } })).toBe(false);
  });

  it('espera Retry-After e tenta de novo até 3 vezes', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    let calls = 0;
    const run = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls < 3) {
        const error: any = new Error('rate');
        error.response = { status: 429, headers: { 'retry-after': '1' } };
        throw error;
      }
      return 'ok';
    });

    await expect(with429Retry(run, { sleep })).resolves.toBe('ok');
    expect(run).toHaveBeenCalledTimes(3);
    expect(sleep).toHaveBeenCalledTimes(2);
  });

  it('usa fallbackMs quando Retry-After falta', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    let calls = 0;
    const run = jest.fn().mockImplementation(async () => {
      calls += 1;
      if (calls === 1) {
        const error: any = new Error('rate');
        error.response = { status: 429, headers: {} };
        throw error;
      }
      return 'ok';
    });

    await expect(
      with429Retry(run, { sleep, fallbackMs: 15 * 60 * 1000 }),
    ).resolves.toBe('ok');
    expect(sleep).toHaveBeenCalledWith(15 * 60 * 1000);
  });

  it('falha depois de 3 retries em 429', async () => {
    const sleep = jest.fn().mockResolvedValue(undefined);
    const run = jest.fn().mockImplementation(async () => {
      const error: any = new Error('rate');
      error.response = { status: 429, headers: { 'retry-after': '1' } };
      throw error;
    });

    await expect(with429Retry(run, { sleep })).rejects.toThrow('rate');
    expect(run).toHaveBeenCalledTimes(4);
  });
});
