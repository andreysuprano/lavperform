import { OpenRouterClient } from 'src/integrations/openrouter/openrouter.client';
import {
  extractImageDataUrl,
  extractTextContent,
} from 'src/integrations/openrouter/openrouter.types';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

describe('OpenRouter client', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.OPENROUTER_TEXT_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;
  });

  it('extrai texto e imagem do payload do chat', () => {
    expect(
      extractTextContent({
        choices: [{ message: { content: '  legenda  ' } }],
      }),
    ).toBe('  legenda  ');
    expect(
      extractImageDataUrl({
        choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
      }),
    ).toBe(TINY);
  });

  it('chama só openrouter.ai para texto e imagem', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_TEXT_MODEL = 'google/gemini-2.5-flash';
    process.env.OPENROUTER_IMAGE_MODEL = 'google/gemini-2.5-flash-image';
    const calls: Array<{ url: string; body: any }> = [];
    global.fetch = jest.fn(async (url: string, init: any) => {
      const body = JSON.parse(init.body);
      calls.push({ url: String(url), body });
      if (body.modalities) {
        return {
          ok: true,
          json: async () => ({
            choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"ok":true}' } }],
        }),
      } as Response;
    }) as typeof fetch;

    const client = new OpenRouterClient();
    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).resolves.toBe('{"ok":true}');
    await expect(client.generateImage('fundo sem texto')).resolves.toBe(TINY);

    expect(calls).toHaveLength(2);
    for (const call of calls) {
      expect(call.url).toBe('https://openrouter.ai/api/v1/chat/completions');
      expect(call.url).not.toContain('api.openai.com');
    }
    expect(calls[0].body.model).toBe('google/gemini-2.5-flash');
    expect(calls[1].body.model).toBe('google/gemini-2.5-flash-image');
    expect(calls[1].body.modalities).toEqual(['image', 'text']);
    expect(calls[1].body.messages[0].content).toBe('fundo sem texto');

    await client.generateImage('fundo sem texto', [TINY]);
    const withReference = calls[2].body.messages[0].content;
    expect(Array.isArray(withReference)).toBe(true);
    expect(withReference[1]).toEqual({
      type: 'image_url',
      image_url: { url: TINY },
    });
  });

  it('mostra falha HTTP e timeout da OpenRouter', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    const client = new OpenRouterClient();
    global.fetch = jest.fn(async () => ({
      ok: false,
      status: 502,
      text: async () => 'bad gateway',
    })) as unknown as typeof fetch;
    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).rejects.toThrow(/OpenRouter respondeu 502/);

    global.fetch = jest.fn(async () => {
      const error = new Error('aborted');
      error.name = 'AbortError';
      throw error;
    }) as unknown as typeof fetch;
    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).rejects.toThrow(/demorou demais/);
  });

  it('falha quando a chave não existe', async () => {
    const client = new OpenRouterClient();
    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).rejects.toThrow(/OPENROUTER_API_KEY/);
  });
});
