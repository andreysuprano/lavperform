/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/require-await */
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

  it('detecta modelo sem input de imagem e sugere um que aceita', async () => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.OPENROUTER_IMAGE_MODEL = 'vendor/text-only';
    global.fetch = jest.fn(async (url: string) => {
      if (String(url).includes('/models')) {
        return {
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'vendor/text-only',
                architecture: {
                  input_modalities: ['text'],
                  output_modalities: ['image'],
                },
              },
              {
                id: 'google/gemini-2.5-flash-image',
                architecture: {
                  input_modalities: ['text', 'image'],
                  output_modalities: ['image', 'text'],
                },
              },
            ],
          }),
        } as Response;
      }
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
        }),
      } as Response;
    }) as typeof fetch;

    const client = new OpenRouterClient();
    await expect(client.referenceCapability()).resolves.toEqual({
      accepts: false,
      suggestion: 'google/gemini-2.5-flash-image',
    });
    await client.generateImage(
      'fundo',
      [TINY],
      'google/gemini-2.5-flash-image',
    );
    const body = JSON.parse(
      ((global.fetch as jest.Mock).mock.calls.at(-1)[1] as { body: string })
        .body,
    );
    expect(body.model).toBe('google/gemini-2.5-flash-image');
    expect(body.messages[0].content[1].image_url.url).toBe(TINY);
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
    });
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
