/**
 * Verifica a migration e o fluxo brand -> briefing -> geração -> camadas
 * contra o Postgres local. A OpenRouter é simulada. Não use em produção.
 *
 * DATABASE_URL=postgresql://lavperform:lavperform@127.0.0.1:5432/lavperform \
 *   npx ts-node -r tsconfig-paths/register scripts/verify-social-posts-db.ts
 */
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { SocialPostsService } from '../src/social-posts/social-posts.service';
import { OpenRouterClient } from '../src/integrations/openrouter/openrouter.client';

const TINY =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';

async function main() {
  if (!process.env.DATABASE_URL) {
    throw new Error('DATABASE_URL ausente');
  }
  const tables = await listTables();
  for (const name of [
    'brand_identities',
    'social_post_drafts',
    'social_post_variations',
  ]) {
    if (!tables.includes(name)) {
      throw new Error(`Tabela ${name} não existe. Rode prisma migrate deploy.`);
    }
  }

  process.env.OPENROUTER_API_KEY =
    process.env.OPENROUTER_API_KEY || 'local-mock';
  const originalFetch = global.fetch;
  global.fetch = (async (_url: string, init?: RequestInit) => {
    const body = JSON.parse(String(init?.body ?? '{}'));
    if (body.modalities) {
      return jsonResponse({
        choices: [{ message: { images: [{ image_url: { url: TINY } }] } }],
      });
    }
    return jsonResponse({
      choices: [
        {
          message: {
            content: JSON.stringify({
              variations: [1, 2, 3, 4].map((index) => ({
                headline: `Edredom novo ${index}`,
                badgeText: '20% OFF',
                captionShort: `curta ${index}`,
                captionMedium: `media ${index}`,
                captionLong: `longa ${index}`,
                hashtags: ['#lavanderia'],
              })),
            }),
          },
        },
      ],
    });
  }) as typeof fetch;

  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });
  const service = new SocialPostsService(prisma as any, new OpenRouterClient());

  try {
    for (let round = 1; round <= 3; round += 1) {
      const suffix = `${Date.now()}-${round}`;
      const company = await prisma.company.create({
        data: {
          name: `Lavanderia teste ${suffix}`,
          cnpj: `00.000.000/000${round}-${suffix.slice(-2)}`,
          email: `social-${suffix}@example.com`,
          state: 'ACTIVE',
        },
      });
      const user = await prisma.user.create({
        data: {
          name: 'Marina',
          email: `marina-${suffix}@example.com`,
          phone: '41999999999',
          password: 'hash',
          userCompanies: { create: { companyId: company.id } },
        },
      });

      const brand = await service.saveBrand(user.id, company.id, {
        primaryColor: '#1E88E5',
        deepColor: '#093A58',
        accentColor: '#FFD23F',
        neutralColor: '#FFFFFF',
        titleFont: 'Poppins',
        bodyFont: 'Inter',
        tones: ['Próximo', 'Bem-humorado'],
        voiceNotes: 'Frases curtas',
        references: null,
        logoLightUrl: null,
        logoDarkUrl: null,
      });
      if (brand.primaryColor !== '#1E88E5') {
        throw new Error('identidade não persistiu');
      }

      const created = await service.createDraft(user.id, {
        companyId: company.id,
        objective: 'promocao',
        theme: '20% de desconto na lavagem de edredons no Batel',
        format: 'carousel',
        slideCount: 2,
        artStyle: 'fotografico_clean',
        includeCaption: true,
      });
      const generated = await service.generate(user.id, created.id);
      if (generated.variations.length !== 4) {
        throw new Error(`rodada ${round}: esperava 4 variações`);
      }
      const first = generated.variations[0];
      if (first.slides[0].backgroundImage !== TINY) {
        throw new Error('fundo não separado da camada de texto');
      }
      if (first.slides.length !== 2) {
        throw new Error('carrossel deveria ter 2 slides');
      }
      const title = first.slides[0].layers.find(
        (layer) => layer.type === 'title',
      );
      if (!title?.text?.includes('Edredom')) {
        throw new Error('título não veio como camada');
      }

      const edited = await service.updateVariation(user.id, first.id, {
        slideIndex: 0,
        layers: first.slides[0].layers.map((layer) =>
          layer.type === 'title'
            ? { ...layer, text: 'Edredom pronto hoje.' }
            : layer,
        ),
        headline: 'Edredom pronto hoje.',
      });
      const savedTitle = edited.slides[0].layers.find(
        (layer) => layer.type === 'title',
      );
      if (savedTitle?.text !== 'Edredom pronto hoje.') {
        throw new Error('edição da camada não persistiu');
      }
      if (edited.slides[0].backgroundImage !== TINY) {
        throw new Error('editar texto alterou o fundo');
      }

      await prisma.userCompany.deleteMany({ where: { companyId: company.id } });
      await prisma.company.delete({ where: { id: company.id } });
      await prisma.user.delete({ where: { id: user.id } });
      console.log(`rodada ${round} ok`);
    }
    console.log('fluxo social posts verificado no banco local');
  } finally {
    global.fetch = originalFetch;
    await prisma.$disconnect();
    await pool.end();
  }
}

async function listTables() {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const result = await pool.query(
    `SELECT tablename FROM pg_tables WHERE schemaname = 'public'`,
  );
  await pool.end();
  return result.rows.map((row) => row.tablename as string);
}

function jsonResponse(body: unknown) {
  return {
    ok: true,
    json: async () => body,
    text: async () => JSON.stringify(body),
  } as Response;
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
