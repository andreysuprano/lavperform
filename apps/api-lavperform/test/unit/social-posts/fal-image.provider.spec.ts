import {
  FAL_CURATED_TEXT_TO_IMAGE,
  IMAGE_EXAMPLE_PROMPT,
  referenceAlternative,
  buildImageModelOptions,
} from 'src/integrations/image/fal.catalog';
import { buildFalRequest } from 'src/integrations/image/fal.input';
import {
  FalImageError,
  FalQueueClient,
  redactSecrets,
} from 'src/integrations/image/fal.queue';
import { parseImageModelId } from 'src/integrations/image/image-model-id';
import {
  falProviderActive,
  falProviderRequested,
  resolveFalModel,
  SocialImageProvider,
} from 'src/integrations/image/social-image.provider';
import {
  falGenerationCost,
  openRouterImageCost,
  parseFalPrices,
  textGenerationCost,
} from 'src/integrations/image/generation-cost';
const TINY_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);
const SECRET = 'fal-test-secret-should-not-leak';

function json(payload: unknown, status = 200): Response {
  const text = JSON.stringify(payload);
  return {
    ok: status >= 200 && status < 300,
    status,
    text: () => Promise.resolve(text),
    json: () => Promise.resolve(payload),
    headers: { get: () => 'application/json' },
    arrayBuffer: () => Promise.resolve(TINY_PNG.buffer),
  } as unknown as Response;
}

describe('identificador de modelo de imagem', () => {
  it('trata id sem prefixo como OpenRouter', () => {
    expect(parseImageModelId('google/gemini-2.5-flash-image')).toEqual({
      provider: 'openrouter',
      modelId: 'google/gemini-2.5-flash-image',
      qualified: 'openrouter:google/gemini-2.5-flash-image',
    });
    expect(parseImageModelId('fal:fal-ai/flux-pro/v1.1').provider).toBe('fal');
  });
});

describe('pedido do fal por formato e referência', () => {
  it('pede feed 1:1 e story 9:16 em cada modelo curado', () => {
    for (const model of FAL_CURATED_TEXT_TO_IMAGE) {
      const feed = buildFalRequest(model, 'fundo', 'feed');
      const story = buildFalRequest(model, 'fundo', 'story');
      if (model.sizeMode === 'aspect_ratio') {
        expect(feed.body.aspect_ratio).toBe('1:1');
        expect(story.body.aspect_ratio).toBe('9:16');
      } else {
        expect(feed.body.image_size).toBe('square_hd');
        expect(story.body.image_size).toBe('portrait_16_9');
      }
      expect(feed.body.prompt).toBe('fundo');
      expect(JSON.stringify(feed.body)).not.toMatch(/legenda|caption/i);
    }
  });

  it('manda a referência para o endpoint redux, edit ou image-to-image', () => {
    const flux = FAL_CURATED_TEXT_TO_IMAGE.find(
      (model) => model.endpointId === 'fal-ai/flux-pro/v1.1',
    );
    const seedream = FAL_CURATED_TEXT_TO_IMAGE.find((model) =>
      model.endpointId.includes('seedream'),
    );
    const imagen = FAL_CURATED_TEXT_TO_IMAGE.find((model) =>
      model.endpointId.includes('imagen'),
    );
    if (!flux || !seedream || !imagen) throw new Error('catálogo incompleto');
    const one = buildFalRequest(flux, 'fundo', 'story', {
      referenceImages: [
        'https://cdn.example/a.png',
        'https://cdn.example/b.png',
      ],
    });
    expect(one.endpointId).toBe('fal-ai/flux-pro/v1.1/redux');
    expect(one.body.image_url).toBe('https://cdn.example/a.png');
    expect(one.body.image_size).toBe('portrait_16_9');
    expect(one.notice).toMatch(/primeira/);

    const many = buildFalRequest(seedream, 'fundo', 'feed', {
      referenceImages: [
        'https://cdn.example/a.png',
        'https://cdn.example/b.png',
      ],
    });
    expect(many.endpointId).toContain('/edit');
    expect(many.body.image_urls).toHaveLength(2);

    const skipped = buildFalRequest(imagen, 'fundo', 'feed', {
      referenceImages: ['data:image/png;base64,aaaa'],
    });
    expect(skipped.endpointId).toBe(imagen.endpointId);
    expect(skipped.body.image_url).toBeUndefined();
    expect(skipped.referencesIgnored).toBe(true);
    expect(skipped.notice).toMatch(/não usa imagens de referência/);
  });

  it('não inventa Higgsfield e inclui se a API do fal devolver', () => {
    expect(
      FAL_CURATED_TEXT_TO_IMAGE.some((model) =>
        model.endpointId.includes('higgsfield'),
      ),
    ).toBe(false);
  });
});

describe('fila do fal', () => {
  it('consulta a fila, baixa a imagem e devolve data URL', async () => {
    const calls: string[] = [];
    let polls = 0;
    const fetching = ((url: string, init?: RequestInit) => {
      const target = String(url);
      calls.push(`${init?.method ?? 'GET'} ${target}`);
      if (target.endsWith('/v1.1') || target.endsWith('/v1.1/redux')) {
        return json({
          status_url:
            'https://queue.fal.run/fal-ai/flux-pro/requests/req-1/status',
          response_url: 'https://queue.fal.run/fal-ai/flux-pro/requests/req-1',
          cancel_url:
            'https://queue.fal.run/fal-ai/flux-pro/requests/req-1/cancel',
        });
      }
      if (target.endsWith('/status')) {
        polls += 1;
        return json({ status: polls > 1 ? 'COMPLETED' : 'IN_QUEUE' });
      }
      if (target.endsWith('/req-1')) {
        return json({
          images: [{ url: 'https://v3b.fal.media/files/example.png' }],
        });
      }
      return {
        ok: true,
        status: 200,
        headers: { get: () => 'image/png' },
        arrayBuffer: () => Promise.resolve(TINY_PNG.buffer),
        text: () => Promise.resolve(''),
      } as unknown as Response;
    }) as unknown as typeof fetch;
    const clockHolder = { value: 0 };
    const timed = new FalQueueClient({
      fetchImpl: fetching,
      sleep: () => {
        clockHolder.value += 10;
        return Promise.resolve();
      },
      now: () => clockHolder.value,
    });
    const model = FAL_CURATED_TEXT_TO_IMAGE[0];
    const result = await timed.generate({
      model,
      prompt: 'fundo',
      format: 'feed',
      apiKey: SECRET,
      timeoutMs: 1_000,
      pollMs: 10,
    });
    expect(result.dataUrl.startsWith('data:image/png;base64,')).toBe(true);
    expect(calls.some((call) => call.startsWith('PUT '))).toBe(false);
    expect(JSON.stringify(calls)).not.toContain(SECRET);
  });

  it('cancela a fila no timeout e não devolve a chave', async () => {
    const calls: string[] = [];
    let clock = 0;
    const queue = new FalQueueClient({
      now: () => clock,
      sleep: () => {
        clock += 50;
        return Promise.resolve();
      },
      fetchImpl: ((url: string, init?: RequestInit) => {
        calls.push(`${init?.method ?? 'GET'} ${url}`);
        const headers = new Headers(init?.headers);
        expect(headers.get('authorization')).not.toContain('log');
        if ((init?.method ?? 'GET') === 'POST') {
          return json({
            status_url:
              'https://queue.fal.run/fal-ai/flux-pro/requests/req-2/status',
            response_url:
              'https://queue.fal.run/fal-ai/flux-pro/requests/req-2',
            cancel_url:
              'https://queue.fal.run/fal-ai/flux-pro/requests/req-2/cancel',
          });
        }
        if (String(url).endsWith('/cancel'))
          return json({ status: 'CANCELLED' });
        return json({ status: 'IN_QUEUE' });
      }) as unknown as typeof fetch,
    });
    await expect(
      queue.generate({
        model: FAL_CURATED_TEXT_TO_IMAGE[0],
        prompt: 'fundo',
        format: 'feed',
        apiKey: SECRET,
        timeoutMs: 40,
        pollMs: 10,
      }),
    ).rejects.toMatchObject({ reason: 'timeout' });
    expect(
      calls.some((call) => call.startsWith('PUT ') && call.includes('/cancel')),
    ).toBe(true);
    expect(calls.join('\n')).not.toContain(SECRET);
  });

  it('trata falha da fila e chave recusada sem vazar o segredo', async () => {
    const queue = new FalQueueClient({
      fetchImpl: ((_url: string, init?: RequestInit) => {
        if ((init?.method ?? 'GET') === 'POST') {
          return json({ detail: SECRET }, 401);
        }
        return json({ status: 'FAILED' });
      }) as unknown as typeof fetch,
    });
    const error = await queue
      .generate({
        model: FAL_CURATED_TEXT_TO_IMAGE[0],
        prompt: 'fundo',
        format: 'story',
        apiKey: SECRET,
        timeoutMs: 1000,
        pollMs: 1,
      })
      .catch((caught: unknown) => caught);
    expect(error).toBeInstanceOf(FalImageError);
    expect((error as Error).message).not.toContain(SECRET);
    expect(redactSecrets(`falhou ${SECRET}`, [SECRET])).not.toContain(SECRET);
  });
});

describe('escolha do provedor por ambiente', () => {
  const previous = {
    provider: process.env.SOCIAL_IMAGE_PROVIDER,
    key: process.env.FAL_KEY,
    model: process.env.FAL_IMAGE_MODEL,
  };

  afterEach(() => {
    process.env.SOCIAL_IMAGE_PROVIDER = previous.provider;
    process.env.FAL_KEY = previous.key;
    process.env.FAL_IMAGE_MODEL = previous.model;
  });

  it('não liga o fal sem a variável ou sem a chave', () => {
    delete process.env.SOCIAL_IMAGE_PROVIDER;
    process.env.FAL_KEY = SECRET;
    expect(falProviderRequested()).toBe(false);
    expect(falProviderActive()).toBe(false);

    process.env.SOCIAL_IMAGE_PROVIDER = 'fal';
    delete process.env.FAL_KEY;
    expect(falProviderRequested()).toBe(true);
    expect(falProviderActive()).toBe(false);
    expect(new SocialImageProvider(new FalQueueClient()).isActive()).toBe(
      false,
    );
  });

  it('usa o modelo do ambiente quando a chave existe', () => {
    process.env.SOCIAL_IMAGE_PROVIDER = 'fal';
    process.env.FAL_KEY = SECRET;
    process.env.FAL_IMAGE_MODEL = 'fal-ai/imagen4/preview';
    const provider = new SocialImageProvider(new FalQueueClient());
    expect(provider.isActive()).toBe(true);
    expect(provider.model().endpointId).toBe('fal-ai/imagen4/preview');
    expect(provider.acceptsReferences()).toBe(false);
    expect(resolveFalModel('fal-ai/flux/schnell').endpointId).toBe(
      'fal-ai/flux/schnell',
    );
    expect(resolveFalModel('google/gemini-2.5-flash-image').endpointId).toBe(
      'fal-ai/imagen4/preview',
    );
  });
});

describe('custo e miniatura', () => {
  it('estima custo da OpenRouter e lê o preço do fal', () => {
    const text = textGenerationCost({
      prompt: 0.000003,
      completion: 0.000015,
      request: 0,
      image: 0,
      imageOutput: 0,
    });
    expect(text?.estimated).toBe(true);
    expect(text?.label.startsWith('cerca de US$')).toBe(true);
    const image = openRouterImageCost({
      prompt: 0,
      completion: 0,
      request: 0,
      image: 0.04,
      imageOutput: 0,
    });
    expect(image).toEqual({ usd: 0.04, estimated: false, label: 'US$ 0,04' });
    const prices = parseFalPrices({
      prices: [
        {
          endpoint_id: 'fal-ai/flux/dev',
          unit_price: 0.025,
          unit: 'image',
          currency: 'USD',
        },
      ],
    });
    expect(falGenerationCost(prices?.[0])?.label).toBe('US$ 0,03');
  });

  it('marca suporte a referência e escolhe o recomendado', () => {
    const models = buildImageModelOptions({
      openrouter: [
        {
          id: 'google/gemini-2.5-flash-image',
          name: 'Gemini Image',
          imageOutput: true,
        },
      ],
      falModels: FAL_CURATED_TEXT_TO_IMAGE,
      falConfigured: true,
      prices: [],
      measuredMs: new Map(),
      thumbnails: new Map([
        ['fal:fal-ai/flux/schnell', 'data:image/png;base64,a'],
      ]),
    });
    const imagen = models.find((model) => model.id.includes('imagen'));
    const flux = models.find(
      (model) => model.id === 'fal:fal-ai/flux-pro/v1.1',
    );
    expect(imagen?.supportsReferenceImages).toBe(false);
    expect(flux?.supportsReferenceImages).toBe(true);
    expect(imagen?.thumbnailUrl).toBeNull();
    expect(
      models.find((model) => model.id === 'fal:fal-ai/flux/schnell')
        ?.thumbnailUrl,
    ).toContain('data:image');
    expect(
      referenceAlternative(models, imagen?.id ?? '')?.supportsReferenceImages,
    ).toBe(true);
    expect(IMAGE_EXAMPLE_PROMPT).toMatch(/no text/);
  });
});
