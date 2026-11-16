import {
  ExecutionContext,
  INestApplication,
  ValidationPipe,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import * as request from 'supertest';
import { AdminAiModelsModule } from 'src/admin/ai-models/admin-ai-models.module';
import { AdminJwtGuard } from 'src/admin/auth/guards/admin-jwt.guard';
import { OpenRouterClient } from 'src/integrations/openrouter/openrouter.client';
import {
  DEFAULT_IMAGE_MODEL,
  DEFAULT_TEXT_MODEL,
} from 'src/integrations/openrouter/openrouter.types';
import { App } from 'supertest/types';

/**
 * Sobe a API admin contra um Postgres local/teste e a OpenRouter mockada.
 * Recusa qualquer host que não seja a máquina local.
 */
function assertLocalTestDatabase(url: string | undefined): string {
  if (!url) {
    throw new Error('DATABASE_URL ausente. Use só um Postgres local de teste.');
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('DATABASE_URL inválida');
  }
  const host = parsed.hostname;
  if (host !== 'localhost' && host !== '127.0.0.1' && host !== '::1') {
    throw new Error(
      `Banco recusado (${host}). Este teste não roda fora de localhost.`,
    );
  }
  return url;
}

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
      name: 'Flux',
      architecture: { output_modalities: ['image'] },
    },
  ],
};

type AiModelsBody = {
  provider: string;
  models: Array<{ id: string }>;
  imageModels: Array<{ id: string; imageOutput: boolean }>;
  text: { source: string; model: string; stored: string | null };
  image: { model: string };
};

function requestBody(init?: RequestInit): {
  model?: string;
  modalities?: string[];
} {
  const raw = init?.body;
  if (typeof raw !== 'string') return {};
  return JSON.parse(raw) as { model?: string; modalities?: string[] };
}

function jsonResponse(payload: unknown): Response {
  return {
    ok: true,
    json: () => Promise.resolve(payload),
  } as Response;
}

function readView(payload: string): AiModelsBody {
  const parsed: unknown = JSON.parse(payload);
  if (!parsed || typeof parsed !== 'object') {
    throw new Error('resposta inválida');
  }
  return parsed as AiModelsBody;
}

describe('seleção de modelos de IA (e2e)', () => {
  let app: INestApplication<App>;
  let client: OpenRouterClient;
  let prisma: PrismaClient;
  let pool: Pool;
  const originalFetch = global.fetch;
  const chatModels: string[] = [];

  beforeAll(async () => {
    const databaseUrl = assertLocalTestDatabase(process.env.DATABASE_URL);
    process.env.OPENROUTER_API_KEY = 'test-key';
    process.env.AI_MODEL_SETTINGS_CACHE_MS = '0';
    process.env.AI_MODEL_CATALOG_CACHE_MS = '0';
    delete process.env.OPENROUTER_TEXT_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;

    global.fetch = jest.fn((url: string, init?: RequestInit) => {
      const target = String(url);
      if (target.includes('openrouter.ai') && target.includes('/models')) {
        return Promise.resolve(jsonResponse(CATALOG));
      }
      if (target.includes('openrouter.ai')) {
        const body = requestBody(init);
        chatModels.push(body.model ?? '');
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
            choices: [{ message: { content: 'legenda pronta' } }],
          }),
        );
      }
      return originalFetch(url, init);
    }) as typeof fetch;

    const moduleRef = await Test.createTestingModule({
      imports: [AdminAiModelsModule],
    })
      .overrideGuard(AdminJwtGuard)
      .useValue({
        canActivate(context: ExecutionContext) {
          const req = context.switchToHttp().getRequest<{
            user: {
              adminUserId: string;
              adminUserName: string;
              adminUserEmail: string;
              role: 'SUPER_ADMIN';
            };
          }>();
          req.user = {
            adminUserId: '11111111-1111-4111-8111-111111111111',
            adminUserName: 'Admin Teste',
            adminUserEmail: 'admin@test.local',
            role: 'SUPER_ADMIN',
          };
          return true;
        },
      })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(
      new ValidationPipe({ transform: true, whitelist: true }),
    );
    await app.init();
    client = app.get(OpenRouterClient);

    pool = new Pool({ connectionString: databaseUrl });
    prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
    await prisma.aiModelSetting.deleteMany();
  });

  afterAll(async () => {
    if (prisma) {
      await prisma.aiModelSetting.deleteMany();
      await prisma.$disconnect();
    }
    await pool?.end();
    await app?.close();
    global.fetch = originalFetch;
    delete process.env.OPENROUTER_API_KEY;
    delete process.env.AI_MODEL_SETTINGS_CACHE_MS;
    delete process.env.AI_MODEL_CATALOG_CACHE_MS;
  });

  it('lista só modelos de imagem no seletor, salva e a geração lê o banco', async () => {
    const listed = await request(app.getHttpServer())
      .get('/admin/ai-models')
      .expect(200);

    const listedView = readView(listed.text);
    expect(listedView.provider).toBe('openrouter');
    expect(listedView.models.map((model) => model.id)).toEqual([
      'google/gemini-2.5-flash',
      'google/gemini-2.5-flash-image',
      'anthropic/claude-sonnet-4',
      'black-forest-labs/flux',
    ]);
    expect(listedView.imageModels.every((model) => model.imageOutput)).toBe(
      true,
    );
    expect(listedView.imageModels.map((model) => model.id)).toEqual([
      'google/gemini-2.5-flash-image',
      'black-forest-labs/flux',
    ]);
    expect(listedView.text.source).toBe('default');
    expect(listedView.text.model).toBe(DEFAULT_TEXT_MODEL);

    await request(app.getHttpServer())
      .put('/admin/ai-models')
      .send({
        textModel: 'anthropic/claude-sonnet-4',
        imageModel: 'google/gemini-2.5-flash',
      })
      .expect(400);

    const saved = await request(app.getHttpServer())
      .put('/admin/ai-models')
      .send({
        textModel: 'anthropic/claude-sonnet-4',
        imageModel: 'black-forest-labs/flux',
      })
      .expect(200);

    const savedView = readView(saved.text);
    expect(savedView.text).toMatchObject({
      model: 'anthropic/claude-sonnet-4',
      source: 'database',
      stored: 'anthropic/claude-sonnet-4',
    });
    expect(savedView.image.model).toBe('black-forest-labs/flux');

    const row = await prisma.aiModelSetting.findUnique({
      where: { id: 'default' },
    });
    expect(row?.textModel).toBe('anthropic/claude-sonnet-4');
    expect(row?.imageModel).toBe('black-forest-labs/flux');
    expect(row?.updatedById).toBe('11111111-1111-4111-8111-111111111111');

    chatModels.length = 0;
    await expect(
      client.completeText([{ role: 'user', content: 'oi' }]),
    ).resolves.toBe('legenda pronta');
    await expect(client.generateImage('fundo')).resolves.toContain(
      'data:image',
    );
    expect(chatModels).toEqual([
      'anthropic/claude-sonnet-4',
      'black-forest-labs/flux',
    ]);

    await prisma.aiModelSetting.update({
      where: { id: 'default' },
      data: {
        textModel: 'removed/model',
        imageModel: 'anthropic/claude-sonnet-4',
      },
    });
    process.env.OPENROUTER_TEXT_MODEL = 'google/gemini-2.5-flash';
    chatModels.length = 0;
    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');
    expect(chatModels).toEqual([
      'google/gemini-2.5-flash',
      DEFAULT_IMAGE_MODEL,
    ]);

    await request(app.getHttpServer())
      .put('/admin/ai-models')
      .send({ textModel: null, imageModel: null })
      .expect(200);
    delete process.env.OPENROUTER_TEXT_MODEL;
    delete process.env.OPENROUTER_IMAGE_MODEL;
    chatModels.length = 0;
    await client.completeText([{ role: 'user', content: 'oi' }]);
    await client.generateImage('fundo');
    expect(chatModels).toEqual([DEFAULT_TEXT_MODEL, DEFAULT_IMAGE_MODEL]);
  });
});
