/**
 * Sincroniza empresas (clientes B2B) do LavPerform para o banco lavai-db.
 *
 * Cenário típico: lavai-db novo/vazio após deploy — recria todas as companies
 * e atualiza o vínculo overAgentCompanyId no LavPerform.
 *
 * Uso:
 *   cd apps/lavai-agent
 *   LAVPERFORM_DATABASE_URL="postgresql://..." node scripts/sync-lavperform-companies.mjs --force
 *
 * Flags:
 *   --force        Recria mesmo quando overAgentCompanyId já existe (banco lavai-db novo)
 *   --dry-run      Simula sem gravar
 *   --with-agents  Cria agente de IA a partir do AiAgent legado + WhatsappInstance
 *   --active-only  Ignora empresas INACTIVE/PENDING (padrão: inclui todas não deletadas)
 *
 * Variáveis:
 *   DATABASE_URL              → lavai-db (lê do .env local)
 *   LAVPERFORM_DATABASE_URL   → banco LavPerform (obrigatório)
 */

import 'dotenv/config';
import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { config as loadEnv } from 'dotenv';
import { Client } from 'pg';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const apiEnvPath = join(scriptDir, '../../api-lavperform/.env');

if (!process.env.LAVPERFORM_DATABASE_URL && existsSync(apiEnvPath)) {
  const parsed = loadEnv({ path: apiEnvPath }).parsed;
  if (parsed?.DATABASE_URL) {
    process.env.LAVPERFORM_DATABASE_URL = parsed.DATABASE_URL;
  }
}

const args = new Set(process.argv.slice(2));
const FORCE = args.has('--force');
const DRY_RUN = args.has('--dry-run');
const WITH_AGENTS = args.has('--with-agents');
const ACTIVE_ONLY = args.has('--active-only');

const LAVAI_DATABASE_URL = process.env.DATABASE_URL;
const LAVPERFORM_DATABASE_URL = process.env.LAVPERFORM_DATABASE_URL;

if (!LAVAI_DATABASE_URL) {
  console.error('DATABASE_URL não definido (lavai-db).');
  process.exit(1);
}

if (!LAVPERFORM_DATABASE_URL) {
  console.error('LAVPERFORM_DATABASE_URL não definido (banco LavPerform).');
  process.exit(1);
}

function normalizeSlug(raw, fallbackId) {
  const base = String(raw ?? fallbackId)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');

  const slug = base || fallbackId.toLowerCase().replace(/[^a-z0-9-]/g, '-');
  return slug.slice(0, 80);
}

function resolveUniqueSlug(baseSlug, companyId, usedSlugs) {
  if (!usedSlugs.has(baseSlug)) {
    usedSlugs.add(baseSlug);
    return baseSlug;
  }

  const suffix = companyId.replace(/-/g, '').slice(0, 8);
  const candidate = `${baseSlug}-${suffix}`.slice(0, 80);
  usedSlugs.add(candidate);
  return candidate;
}

function mapVoiceTone(personality) {
  switch (personality) {
    case 'FRIENDLY':
      return 'FRIENDLY';
    case 'RELAXED':
      return 'INFORMAL';
    case 'PROFESSIONAL':
    default:
      return 'PROFESSIONAL';
  }
}

function mapCommunicationStyle(responseStyle) {
  switch (responseStyle) {
    case 'CONCISE':
      return 'CONCISE';
    case 'DETAILED':
      return 'DETAILED';
    case 'BALANCED':
    default:
      return 'BALANCED';
  }
}

async function fetchLavperformCompanies(client) {
  const stateFilter = ACTIVE_ONLY ? `AND c.state = 'ACTIVE'` : '';

  const { rows } = await client.query(`
    SELECT
      c.id,
      c.name,
      c.slug,
      c.email,
      c.phone,
      c.state,
      c."deletedAt" AS deleted_at,
      c."overAgentCompanyId" AS over_agent_company_id,
      wa.name AS whatsapp_instance_name,
      ai.id AS ai_agent_id,
      ai.name AS ai_agent_name,
      ai.personality,
      ai."responseStyle" AS response_style,
      ai."systemPrompt" AS system_prompt,
      ai."userSystemPrompt" AS user_system_prompt,
      ai.active AS ai_active,
      ai."contextWindowLength" AS context_window_length
    FROM "Company" c
    LEFT JOIN LATERAL (
      SELECT name
      FROM "WhatsappInstance"
      WHERE "companyId" = c.id
      ORDER BY "createdAt" ASC
      LIMIT 1
    ) wa ON true
    LEFT JOIN LATERAL (
      SELECT *
      FROM "AiAgent"
      WHERE "companyId" = c.id
      ORDER BY active DESC, "createdAt" ASC
      LIMIT 1
    ) ai ON true
    WHERE c."deletedAt" IS NULL
      ${stateFilter}
    ORDER BY c.name ASC
  `);

  return rows;
}

async function lavaiCompanyExists(client, companyId) {
  const { rowCount } = await client.query(
    'SELECT 1 FROM companies WHERE id = $1 LIMIT 1',
    [companyId],
  );
  return rowCount > 0;
}

async function lavaiAgentExistsForCompany(client, companyId, instanceName) {
  if (instanceName) {
    const { rowCount } = await client.query(
      'SELECT 1 FROM agents WHERE company_id = $1 AND instance_name = $2 LIMIT 1',
      [companyId, instanceName],
    );
    return rowCount > 0;
  }

  const { rowCount } = await client.query(
    'SELECT 1 FROM agents WHERE company_id = $1 LIMIT 1',
    [companyId],
  );
  return rowCount > 0;
}

async function createLavaiCompany(client, company) {
  const id = randomUUID();
  const now = new Date();

  await client.query(
    `INSERT INTO companies (id, name, slug, email, phone, active, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $7)`,
    [
      id,
      company.name,
      company.slug,
      company.email,
      company.phone,
      company.active,
      now,
    ],
  );

  return id;
}

async function createLavaiAgent(client, lavaiCompanyId, row) {
  const agentId = randomUUID();
  const personaName = row.ai_agent_name || row.name || 'Assistente';
  const systemPrompt =
    row.system_prompt ||
    `Você é ${personaName}, assistente virtual da ${row.name}. Responda de forma cordial e objetiva.`;

  await client.query(
    `INSERT INTO agents (
       id, company_id, name, description, active, instance_name, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [
      agentId,
      lavaiCompanyId,
      personaName,
      null,
      row.ai_active ?? true,
      row.whatsapp_instance_name ?? null,
    ],
  );

  await client.query(
    `INSERT INTO agent_personas (
       id, agent_id, persona_name, system_prompt, context_prompt,
       voice_tone, communication_style, language, created_at, updated_at
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'PT_BR', NOW(), NOW())`,
    [
      randomUUID(),
      agentId,
      personaName,
      systemPrompt,
      row.user_system_prompt,
      mapVoiceTone(row.personality),
      mapCommunicationStyle(row.response_style),
    ],
  );

  await client.query(
    `INSERT INTO agent_model_configs (
       id, agent_id, provider, model_name, temperature, max_tokens,
       top_p, frequency_penalty, presence_penalty, streaming, created_at, updated_at
     ) VALUES ($1, $2, 'OPENAI', 'openai/gpt-4o', 0.7, 1024, 1.0, 0.0, 0.0, false, NOW(), NOW())`,
    [randomUUID(), agentId],
  );

  const windowSize = Math.min(Math.max(row.context_window_length ?? 10, 1), 100);

  await client.query(
    `INSERT INTO agent_memory_configs (
       id, agent_id, memory_type, window_size, max_summary_tokens,
       use_long_term_memory, created_at, updated_at
     ) VALUES ($1, $2, 'BUFFER', $3, 2000, false, NOW(), NOW())`,
    [randomUUID(), agentId, windowSize],
  );

  await client.query(
    `INSERT INTO agent_journey_configs (
       id, agent_id, enabled, journey_trigger, follow_up_enabled,
       cancel_on_reply, follow_up_steps, help_keywords, help_auto_escalate,
       purchase_webhook_enabled, created_at, updated_at
     ) VALUES (
       $1, $2, false, 'FIRST_MESSAGE', true, true, '[]'::jsonb,
       ARRAY['problema','ajuda','atendente','humano']::text[], true, true, NOW(), NOW()
     )`,
    [randomUUID(), agentId],
  );

  return agentId;
}

async function updateLavperformLink(client, lavperformCompanyId, lavaiCompanyId) {
  await client.query(
    `UPDATE "Company" SET "overAgentCompanyId" = $1 WHERE id = $2`,
    [lavaiCompanyId, lavperformCompanyId],
  );
}

async function main() {
  console.log('Sincronizando empresas LavPerform → lavai-db\n');
  console.log(`  force:        ${FORCE}`);
  console.log(`  dry-run:      ${DRY_RUN}`);
  console.log(`  with-agents:  ${WITH_AGENTS}`);
  console.log(`  active-only:  ${ACTIVE_ONLY}\n`);

  const lavperform = new Client({ connectionString: LAVPERFORM_DATABASE_URL });
  const lavai = new Client({ connectionString: LAVAI_DATABASE_URL });

  await lavperform.connect();
  await lavai.connect();

  const companies = await fetchLavperformCompanies(lavperform);
  console.log(`Encontradas ${companies.length} empresa(s) no LavPerform\n`);

  const usedSlugs = new Set(
    (await lavai.query('SELECT slug FROM companies')).rows.map((row) => row.slug),
  );

  const summary = {
    total: companies.length,
    created: 0,
    skipped: 0,
    agentsCreated: 0,
    errors: 0,
  };

  for (const row of companies) {
    const label = `${row.name} (${row.id})`;

    try {
      if (
        !FORCE &&
        row.over_agent_company_id &&
        (await lavaiCompanyExists(lavai, row.over_agent_company_id))
      ) {
        console.log(`· ${label} — já vinculada (${row.over_agent_company_id})`);
        summary.skipped++;
        continue;
      }

      const baseSlug = normalizeSlug(row.slug, row.id);
      const slug = resolveUniqueSlug(baseSlug, row.id, usedSlugs);
      const active = row.state === 'ACTIVE';

      if (DRY_RUN) {
        console.log(`→ [dry-run] ${label}`);
        console.log(`    slug=${slug} active=${active}`);
        if (WITH_AGENTS && row.ai_agent_id) {
          console.log(`    agente=${row.ai_agent_name ?? 'Assistente'} instance=${row.whatsapp_instance_name ?? '-'}`);
        }
        summary.created++;
        continue;
      }

      await lavai.query('BEGIN');

      let lavaiCompanyId;

      try {
        lavaiCompanyId = await createLavaiCompany(lavai, {
          name: row.name,
          slug,
          email: row.email,
          phone: row.phone,
          active,
        });

        if (WITH_AGENTS && row.ai_agent_id) {
          const agentExists = await lavaiAgentExistsForCompany(
            lavai,
            lavaiCompanyId,
            row.whatsapp_instance_name,
          );

          if (!agentExists) {
            const agentId = await createLavaiAgent(lavai, lavaiCompanyId, row);
            console.log(`✓ ${label}`);
            console.log(`    company=${lavaiCompanyId} agent=${agentId}`);
            summary.agentsCreated++;
          } else {
            console.log(`✓ ${label}`);
            console.log(`    company=${lavaiCompanyId} (agente já existia)`);
          }
        } else {
          console.log(`✓ ${label}`);
          console.log(`    company=${lavaiCompanyId}`);
        }

        await lavai.query('COMMIT');
      } catch (error) {
        await lavai.query('ROLLBACK');
        throw error;
      }

      await updateLavperformLink(lavperform, row.id, lavaiCompanyId);
      summary.created++;
    } catch (error) {
      console.error(`✗ ${label}`);
      console.error(`    ${error.message}`);
      summary.errors++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`Total:              ${summary.total}`);
  console.log(`Criadas/vinculadas: ${summary.created}`);
  console.log(`Ignoradas:          ${summary.skipped}`);
  if (WITH_AGENTS) console.log(`Agentes criados:    ${summary.agentsCreated}`);
  console.log(`Erros:              ${summary.errors}`);
  console.log('='.repeat(60));

  await lavperform.end();
  await lavai.end();

  if (summary.errors > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
