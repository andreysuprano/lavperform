describe('queue-concurrency.config', () => {
  const envKey = 'QUEUE_CONCURRENCY_WHATSAPP_VALIDATION';
  let previous: string | undefined;

  beforeEach(() => {
    previous = process.env[envKey];
    delete process.env[envKey];
    jest.resetModules();
  });

  afterEach(() => {
    if (previous === undefined) {
      delete process.env[envKey];
    } else {
      process.env[envKey] = previous;
    }
  });

  it('defaults WhatsApp validation concurrency to 5', async () => {
    const config = await import('src/common/queue/queue-concurrency.config');

    expect(config.WHATSAPP_VALIDATION_CONCURRENCY).toBe(5);
  });

  it('allows override via QUEUE_CONCURRENCY_WHATSAPP_VALIDATION', async () => {
    process.env[envKey] = '8';

    const config = await import('src/common/queue/queue-concurrency.config');

    expect(config.WHATSAPP_VALIDATION_CONCURRENCY).toBe(8);
  });

  it('ignores invalid values and falls back to 5', async () => {
    process.env[envKey] = '0';

    const config = await import('src/common/queue/queue-concurrency.config');

    expect(config.WHATSAPP_VALIDATION_CONCURRENCY).toBe(5);
  });
});
