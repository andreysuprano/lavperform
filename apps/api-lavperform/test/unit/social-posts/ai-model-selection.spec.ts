import { BadRequestException } from '@nestjs/common';
import { AiModelSettingsService } from 'src/integrations/openrouter/ai-model-settings.service';
import { OpenRouterClient } from 'src/integrations/openrouter/openrouter.client';
import {
  chooseModel,
  imageOutputModels,
  parseOpenRouterModels,
} from 'src/integrations/openrouter/openrouter.models';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
} from 'src/integrations/openrouter/openrouter.types';
import type { PrismaService } from 'src/prisma/prisma.service';

const CATALOG = {
  data: [
    {
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      architecture: { output_modalities: ['text'] },
    },
    {
      id: 'google/gemini-2.5-flash-image',
      name: 'Gemini 2.5 Flash Image',
      architecture: { output_modalities: ['image', 'text'] },
    },
    {
      id: 'anthropic/claude-sonnet-4',
      name: 'Claude Sonnet 4',
      architecture: { modality: 'text->text' },
    },
    {
      id: 'black-forest-labs/flux',
      name: '  Flux  ',
      architecture: { modality: 'text->image' },
    },
    {
      id: '   ',
      name: 'inválido',
    },
  ],
};

type Row = {
  textModel: string | null;
  imageModel: string | null;
  updatedById: string | null;
};

function memoryStore(initial?: Partial<Row>) {
  let row: Row | null = initial
    ? {
        textModel: initial.textModel ?? null,
        imageModel: initial.imageModel ?? null,
        updatedById: initial.updatedById ?? null,
      }
    : null;
  let reads = 0;
  const prisma = {
    aiModelSetting: {
      findUnique: () => {
        reads += 1;
        return Promise.resolve(row ? { ...row } : null);
      },
      upsert: ({
        create,
        update,
      }: {
        create: Row & { id: string };
        update: Row;
      }) => {
        row = row
          ? { ...row, ...update }
          : {
              textModel: create.textModel,
              imageModel: create.imageModel,
              updatedById: create.updatedById,
            };
        return Promise.resolve({ ...row });
      },
    },
  };
  return {
    prisma: prisma as unknown as PrismaService,
    reads: () => reads,
    current: () => row,
  };
}

function requestBody(init?: RequestInit): Record<string, unknown> {
  const raw = init?.body;
  if (typeof raw !== 'string') return {};
  return JSON.parse(raw) as Record<string, unknown>;
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
}

function mockOpenRouter() {
  const calls: Array<{ url: string; body: Record<string, unknown> | null }> =
    [];
  global.fetch = jest.fn((url: string, init?: RequestInit) => {
    const target = String(url);
    if (target.includes('/models')) {
      calls.push({ url: target, body: null });
      return Promise.resolve(jsonResponse(CATALOG));
    }
    const body = requestBody(init);
    calls.push({ url: target, body });
    if (body.modalities) {
      return Promise.resolve(
        jsonResponse({
          choices: [
            {
              message: {
                images: [{ image_url: { url: 'data:image/png;base64,a' } }],
              },
            },
          ],
        }),
      );
    }
    return Promise.resolve(
      jsonResponse({
        choices: [{ message: { content: 'legenda' } }],
      }),
    );
  }) as typeof fetch;
  return calls;
}

describe('catálogo de modelos da OpenRouter', () => {
  it('lê id, nome e saída de imagem, e ignora id vazio', () => {
    const models = parseOpenRouterModels(CATALOG);
    expect(models).toEqual([
      {
        id: 'google/gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        imageOutput: false,
      },
      {
        id: 'google/gemini-2.5-flash-image',
        name: 'Gemini 2.5 Flash Image',
        imageOutput: true,
      },
      {
        id: 'anthropic/claude-sonnet-4',
        name: 'Claude Sonnet 4',
        imageOutput: false,
      },
      {
        id: 'black-forest-labs/flux',
        name: 'Flux',
        imageOutput: true,
      },
    ]);
    expect(imageOutputModels(models ?? []).map((model) => model.id)).toEqual([
      'google/gemini-2.5-flash-image',
      'black-forest-labs/flux',
    ]);
  });

  it('trata resposta que não é catálogo como indisponível', () => {
    expect(parseOpenRouterModels(null)).toBeNull();
    expect(parseOpenRouterModels({ choices: [] })).toBeNull();
    expect(parseOpenRouterModels([])).toBeNull();
  });
});

describe('escolha do modelo', () => {
  const catalog = parseOpenRouterModels(CATALOG);

  it('usa o valor salvo quando ele existe no catálogo', () => {
    expect(
      chooseModel({
        kind: 'text',
        stored: 'anthropic/claude-sonnet-4',
        envValue: 'google/gemini-2.5-flash',
        fallback: DEFAULT_TEXT_MODEL,
        catalog,
      }),
    ).toEqual({ model: 'anthropic/claude-sonnet-4', source: 'database' });
  });

  it('usa a variável de ambiente quando não há valor salvo', () => {
    expect(
      chooseModel({
        kind: 'image',
        stored: '  ',
        envValue: 'black-forest-labs/flux',
        fallback: DEFAULT_IMAGE_MODEL,
        catalog,
      }),
    ).toEqual({ model: 'black-forest-labs/flux', source: 'environment' });
  });

  it('usa o padrão quando banco e variável estão vazios', () => {
    expect(
      chooseModel({
        kind: 'text',
        stored: null,
        envValue: '   ',
        fallback: DEFAULT_TEXT_MODEL,
        catalog,
      }),
    ).toEqual({ model: DEFAULT_TEXT_MODEL, source: 'default' });
  });

  it('cai no fallback quando o modelo salvo não está no catálogo', () => {
    expect(
      chooseModel({
        kind: 'text',
        stored: 'removed/model',
        envValue: 'anthropic/claude-sonnet-4',
        fallback: DEFAULT_TEXT_MODEL,
        catalog,
      }),
    ).toEqual({ model: 'anthropic/claude-sonnet-4', source: 'environment' });
  });

  it('recusa modelo de imagem que não gera imagem', () => {
    expect(
      chooseModel({
        kind: 'image',
        stored: 'anthropic/claude-sonnet-4',
        envValue: 'google/gemini-2.5-flash',
        fallback: DEFAULT_IMAGE_MODEL,
        catalog,
      }),
    ).toEqual({ model: DEFAULT_IMAGE_MODEL, source: 'default' });
  });

  it('aceita o id salvo se a lista da OpenRouter não carregou', () => {
    expect(
      chooseModel({
        kind: 'text',
        stored: 'custom/vendor-model',
        envValue: DEFAULT_TEXT_MODEL,
        fallback: DEFAULT_TEXT_MODEL,
        catalog: null,
      }),
    ).toEqual({ model: 'custom/vendor-model', source: 'database' });
  });

  it('ignora id malformado quando a lista não carregou', () => {
    expect(
      chooseModel({
        kind: 'text',
        stored: 'não é um modelo',
        envValue: undefined,
        fallback: DEFAULT_TEXT_MODEL,
        catalog: null,
      }),
    ).toEqual({ model: DEFAULT_TEXT_MODEL, source: 'default' });
  });
});

describe('runtime da geração com modelos salvos', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.AI_MODEL_SETTINGS_CACHE_MS = '0';
    process.env.AI_MODEL_CATALOG_CACHE_MS = '0';
    delete process.env.OPENROUTER_TEXT_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;
  });

  afterEach(() => {
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_MODEL_SETTINGS_CACHE_MS;
    delete process.env.AI_MODEL_CATALOG_CACHE_MS;
    delete process.env.OPENROUTER_TEXT_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;
    jest.useRealTimers();
  });

  it('pede a lista de modelos e envia o modelo salvo no chat', async () => {
    const calls = mockOpenRouter();
    const store = memoryStore({
      textModel: 'anthropic/claude-sonnet-4',
      imageModel: 'black-forest-labs/flux',
    });
    const client = new OpenRouterClient(
      new AiModelSettingsService(store.prisma),
    );

    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).resolves.toBe('legenda');
    await expect(client.generateImage('fundo')).resolves.toBe(
      'data:image/png;base64,a',
    );

    expect(calls.map((call) => call.url)).toEqual([
      'https://openrouter.ai/api/v1/models',
      'https://openrouter.ai/api/v1/chat/completions',
      'https://openrouter.ai/api/v1/models',
      'https://openrouter.ai/api/v1/chat/completions',
    ]);
    expect(calls[1].body?.model).toBe('anthropic/claude-sonnet-4');
    expect(calls[3].body?.model).toBe('black-forest-labs/flux');
    expect(calls[3].body?.modalities).toEqual(['image', 'text']);
  });

  it('usa ambiente e padrão quando a escolha não está salva', async () => {
    const calls = mockOpenRouter();
    process.env.OPENROUTER_TEXT_MODEL = 'anthropic/claude-sonnet-4';
    delete process.env.OPENROUTER_IMAGE_MODEL;
    const store = memoryStore();
    const client = new OpenRouterClient(
      new AiModelSettingsService(store.prisma),
    );

    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');

    expect(calls[1].body?.model).toBe('anthropic/claude-sonnet-4');
    expect(calls[3].body?.model).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('ignora modelo salvo inválido e cai no fallback', async () => {
    const calls = mockOpenRouter();
    process.env.OPENROUTER_TEXT_MODEL = 'google/gemini-2.5-flash';
    process.env.OPENROUTER_IMAGE_MODEL = 'anthropic/claude-sonnet-4';
    const store = memoryStore({
      textModel: 'removed/model',
      imageModel: 'google/gemini-2.5-flash',
    });
    const client = new OpenRouterClient(
      new AiModelSettingsService(store.prisma),
    );

    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');

    expect(calls[1].body?.model).toBe('google/gemini-2.5-flash');
    expect(calls[3].body?.model).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('grava a escolha do admin e a geração seguinte já usa o modelo novo', async () => {
    const calls = mockOpenRouter();
    process.env.AI_MODEL_SETTINGS_CACHE_MS = '60000';
    const store = memoryStore();
    const settings = new AiModelSettingsService(store.prisma);
    const client = new OpenRouterClient(settings);

    await client.completeText([{ role: 'user', content: 'oi' }]);
    expect(calls.at(-1)?.body?.model).toBe(DEFAULT_TEXT_MODEL);

    const view = await settings.save(
      {
        textModel: ' anthropic/claude-sonnet-4 ',
        imageModel: 'black-forest-labs/flux',
      },
      'admin-1',
    );
    expect(view.text).toMatchObject({
      model: 'anthropic/claude-sonnet-4',
      source: 'database',
      stored: 'anthropic/claude-sonnet-4',
    });
    expect(view.imageModels.map((model) => model.id)).toEqual([
      'google/gemini-2.5-flash-image',
      'black-forest-labs/flux',
    ]);
    expect(view.models).toHaveLength(4);
    expect(store.current()).toMatchObject({
      textModel: 'anthropic/claude-sonnet-4',
      imageModel: 'black-forest-labs/flux',
      updatedById: 'admin-1',
    });

    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');
    const chats = calls.filter((call) => call.body);
    expect(chats.at(-2)?.body?.model).toBe('anthropic/claude-sonnet-4');
    expect(chats.at(-1)?.body?.model).toBe('black-forest-labs/flux');
  });

  it('recusa modelo desconhecido e modelo de imagem sem saída de imagem', async () => {
    mockOpenRouter();
    const settings = new AiModelSettingsService(memoryStore().prisma);

    await expect(
      settings.save({ textModel: 'nao/existe', imageModel: null }, 'admin-1'),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(
      settings.save(
        {
          textModel: 'anthropic/claude-sonnet-4',
          imageModel: 'anthropic/claude-sonnet-4',
        },
        'admin-1',
      ),
    ).rejects.toThrow(/precisa gerar imagem/);
  });

  it('limpar a escolha devolve o runtime ao fallback', async () => {
    const calls = mockOpenRouter();
    process.env.OPENROUTER_TEXT_MODEL = 'anthropic/claude-sonnet-4';
    const store = memoryStore({
      textModel: 'google/gemini-2.5-flash',
      imageModel: 'black-forest-labs/flux',
    });
    const settings = new AiModelSettingsService(store.prisma);
    const client = new OpenRouterClient(settings);

    await settings.save({ textModel: null, imageModel: '' }, 'admin-1');
    expect(store.current()).toMatchObject({
      textModel: null,
      imageModel: null,
    });

    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');
    const chats = calls.filter((call) => call.body);
    expect(chats.at(-2)?.body?.model).toBe('anthropic/claude-sonnet-4');
    expect(chats.at(-1)?.body?.model).toBe(DEFAULT_IMAGE_MODEL);
  });

  it('segura a escolha em cache e relê o banco depois do prazo', async () => {
    jest.useFakeTimers({
      doNotFake: ['nextTick', 'queueMicrotask', 'setTimeout', 'setImmediate'],
    });
    process.env.AI_MODEL_SETTINGS_CACHE_MS = '15000';
    const calls = mockOpenRouter();
    const store = memoryStore({
      textModel: 'anthropic/claude-sonnet-4',
      imageModel: null,
    });
    const client = new OpenRouterClient(
      new AiModelSettingsService(store.prisma),
    );

    await client.completeText([{ role: 'user', content: 'oi' }]);
    const row = store.current();
    if (!row) throw new Error('linha ausente');
    row.textModel = 'google/gemini-2.5-flash';
    await client.completeText([{ role: 'user', content: 'oi' }]);
    expect(store.reads()).toBe(1);

    jest.advanceTimersByTime(15_001);
    await client.completeText([{ role: 'user', content: 'oi' }]);

    const chats = calls.filter((call) => call.body);
    expect(chats.map((call) => call.body?.model)).toEqual([
      'anthropic/claude-sonnet-4',
      'anthropic/claude-sonnet-4',
      'google/gemini-2.5-flash',
    ]);
    expect(store.reads()).toBe(2);
  });
});
