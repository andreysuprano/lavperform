import {
  DEFAULT_PARTNER_HTTP_DELAY_MS,
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
