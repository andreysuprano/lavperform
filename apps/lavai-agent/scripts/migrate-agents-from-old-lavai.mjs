/**
 * Copia agentes (com configs) do ambiente LavAI antigo para o lavai-db novo.
 *
 * Uso:
 *   cd apps/lavai-agent
 *   OLD_LAVAI_BASE_URL="https://verticeia-new-ai.du3cfm.easypanel.host" \
 *     node scripts/migrate-agents-from-old-lavai.mjs --dry-run
 *
 * Flags:
 *   --dry-run     Simula sem gravar
 *   --replace     Remove agentes existentes da empresa antes de importar
 *   --skip-existing  (padrão) Pula empresas que já têm agente
 *
 * Variáveis:
 *   OLD_LAVAI_BASE_URL        URL do ambiente antigo (obrigatório)
 *   DATABASE_URL              lavai-db destino
 *   LAVPERFORM_DATABASE_URL   opcional — melhora matching + instanceName WhatsApp
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
const DRY_RUN = args.has('--dry-run');
const REPLACE = args.has('--replace');
const SKIP_EXISTING = !REPLACE;

const OLD_BASE_URL = (process.env.OLD_LAVAI_BASE_URL ?? '').replace(/\/$/, '');
const DATABASE_URL = process.env.DATABASE_URL;
const LAVPERFORM_DATABASE_URL = process.env.LAVPERFORM_DATABASE_URL;

if (!OLD_BASE_URL) {
  console.error('OLD_LAVAI_BASE_URL não definido.');
  process.exit(1);
}

if (!DATABASE_URL) {
  console.error('DATABASE_URL não definido.');
  process.exit(1);
}

function normalizeKey(value) {
  return String(value ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .replace(/-+/g, '-');
}

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`HTTP ${response.status} ${url}: ${body.slice(0, 200)}`);
  }
  return response.json();
}

async function loadNewCompanies(client) {
  const { rows } = await client.query('SELECT id, slug, name, email FROM companies');
  const bySlug = new Map();
  const byName = new Map();
  const byEmail = new Map();

  for (const row of rows) {
    bySlug.set(normalizeKey(row.slug), row);
    byName.set(normalizeKey(row.name), row);
    if (row.email) byEmail.set(row.email.toLowerCase(), row);
  }

  return { rows, bySlug, byName, byEmail };
}

async function loadLavperformIndex(client) {
  if (!client) return null;

  const { rows } = await client.query(`
    SELECT
      c.slug,
      c.name,
      c.email,
      c."overAgentCompanyId" AS over_agent_company_id,
      wi.name AS whatsapp_instance_name
    FROM "Company" c
    LEFT JOIN "WhatsappInstance" wi ON wi."companyId" = c.id
    WHERE c."deletedAt" IS NULL
  `);

  const bySlug = new Map();
  const byName = new Map();
  const byEmail = new Map();
  const whatsappByLavaiId = new Map();

  for (const row of rows) {
    if (row.slug) bySlug.set(normalizeKey(row.slug), row);
    byName.set(normalizeKey(row.name), row);
    if (row.email) byEmail.set(row.email.toLowerCase(), row);
    if (row.over_agent_company_id && row.whatsapp_instance_name) {
      whatsappByLavaiId.set(row.over_agent_company_id, row.whatsapp_instance_name);
    }
  }

  return { bySlug, byName, byEmail, whatsappByLavaiId };
}

function resolveTargetCompany(oldCompany, newIndex, lpIndex) {
  const slugKey = normalizeKey(oldCompany.slug);
  const nameKey = normalizeKey(oldCompany.name);
  const emailKey = oldCompany.email?.toLowerCase();

  let hit =
    newIndex.bySlug.get(slugKey) ??
    newIndex.byName.get(nameKey) ??
    (emailKey ? newIndex.byEmail.get(emailKey) : undefined);

  if (!hit && lpIndex) {
    const lp =
      lpIndex.bySlug.get(slugKey) ??
      lpIndex.byName.get(nameKey) ??
      (emailKey ? lpIndex.byEmail.get(emailKey) : undefined);

    if (lp?.over_agent_company_id) {
      hit = newIndex.rows.find((row) => row.id === lp.over_agent_company_id);
    }
  }

  return hit ?? null;
}

async function companyHasAgents(client, companyId) {
  const { rowCount } = await client.query(
    'SELECT 1 FROM agents WHERE company_id = $1 LIMIT 1',
    [companyId],
  );
  return rowCount > 0;
}

async function deleteCompanyAgents(client, companyId) {
  await client.query('DELETE FROM agents WHERE company_id = $1', [companyId]);
}

async function insertAgent(client, companyId, agent, instanceName) {
  const agentId = randomUUID();
  const persona = agent.persona ?? {};
  const model = agent.modelConfig ?? {};
  const memory = agent.memoryConfig ?? {};
  const media = agent.mediaConfig;
  const filter = agent.filterConfig;

  await client.query(
    `INSERT INTO agents (id, company_id, name, description, active, instance_name, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())`,
    [
      agentId,
      companyId,
      agent.name,
      agent.description ?? null,
      agent.active ?? true,
      agent.instanceName ?? instanceName ?? null,
    ],
  );

  await client.query(
    `INSERT INTO agent_personas (
       id, agent_id, persona_name, persona_description, system_prompt,
       behavior_guidelines, guardrails, context_prompt, welcome_message,
       message_signature, voice_tone, communication_style, language,
       created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW(),NOW())`,
    [
      randomUUID(),
      agentId,
      persona.personaName ?? agent.name,
      persona.personaDescription ?? null,
      persona.systemPrompt ?? `Você é ${agent.name}, assistente virtual.`,
      persona.behaviorGuidelines ?? null,
      persona.guardrails ?? null,
      persona.contextPrompt ?? null,
      persona.welcomeMessage ?? null,
      persona.messageSignature ?? null,
      persona.voiceTone ?? 'PROFESSIONAL',
      persona.communicationStyle ?? 'BALANCED',
      persona.language ?? 'PT_BR',
    ],
  );

  await client.query(
    `INSERT INTO agent_model_configs (
       id, agent_id, provider, model_name, temperature, max_tokens,
       top_p, frequency_penalty, presence_penalty, streaming, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
    [
      randomUUID(),
      agentId,
      model.provider ?? 'OPENAI',
      model.modelName ?? 'openai/gpt-4o',
      model.temperature ?? 0.7,
      model.maxTokens ?? 1024,
      model.topP ?? 1,
      model.frequencyPenalty ?? 0,
      model.presencePenalty ?? 0,
      model.streaming ?? false,
    ],
  );

  await client.query(
    `INSERT INTO agent_memory_configs (
       id, agent_id, memory_type, window_size, max_summary_tokens,
       use_long_term_memory, created_at, updated_at
     ) VALUES ($1,$2,$3,$4,$5,$6,NOW(),NOW())`,
    [
      randomUUID(),
      agentId,
      memory.memoryType ?? 'BUFFER',
      memory.windowSize ?? 10,
      memory.maxSummaryTokens ?? 2000,
      memory.useLongTermMemory ?? false,
    ],
  );

  await client.query(
    `INSERT INTO agent_journey_configs (
       id, agent_id, enabled, journey_trigger, follow_up_enabled,
       cancel_on_reply, follow_up_steps, help_keywords, help_auto_escalate,
       help_ack_message, purchase_webhook_enabled, created_at, updated_at
     ) VALUES ($1,$2,false,'FIRST_MESSAGE',true,true,'[]'::jsonb,
       ARRAY['atendente','humano','ajuda']::text[], true, null, true, NOW(), NOW())`,
    [randomUUID(), agentId],
  );

  if (media) {
    await client.query(
      `INSERT INTO agent_media_configs (
         id, agent_id, audio_enabled, audio_default_message,
         image_enabled, image_extraction_prompt, image_default_message,
         video_enabled, video_extraction_prompt, video_default_message,
         created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,NOW(),NOW())`,
      [
        randomUUID(),
        agentId,
        media.audioEnabled ?? true,
        media.audioDefaultMessage ?? null,
        media.imageEnabled ?? true,
        media.imageExtractionPrompt ?? null,
        media.imageDefaultMessage ?? null,
        media.videoEnabled ?? true,
        media.videoExtractionPrompt ?? null,
        media.videoDefaultMessage ?? null,
      ],
    );
  }

  if (filter) {
    await client.query(
      `INSERT INTO agent_filter_configs (
         id, agent_id, allowed_phones, allowed_groups,
         trigger_enabled, trigger_words, trigger_case_sensitive,
         trigger_remove_from_text, created_at, updated_at
       ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,NOW(),NOW())`,
      [
        randomUUID(),
        agentId,
        filter.allowedPhones ?? [],
        filter.allowedGroups ?? [],
        filter.triggerEnabled ?? false,
        filter.triggerWords ?? [],
        filter.triggerCaseSensitive ?? false,
        filter.triggerRemoveFromText ?? false,
      ],
    );
  }

  return agentId;
}

async function main() {
  console.log('Migração de agentes: ambiente antigo → lavai-db\n');
  console.log(`  origem:  ${OLD_BASE_URL}`);
  console.log(`  dry-run: ${DRY_RUN}`);
  console.log(`  replace: ${REPLACE}\n`);

  const oldCompanies = await fetchJson(`${OLD_BASE_URL}/companies`);
  console.log(`Empresas no ambiente antigo: ${oldCompanies.length}`);

  const lavai = new Client({ connectionString: DATABASE_URL });
  await lavai.connect();

  const lavperform = LAVPERFORM_DATABASE_URL
    ? new Client({ connectionString: LAVPERFORM_DATABASE_URL })
    : null;
  if (lavperform) await lavperform.connect();

  const newIndex = await loadNewCompanies(lavai);
  const lpIndex = lavperform ? await loadLavperformIndex(lavperform) : null;

  const summary = {
    oldAgents: 0,
    imported: 0,
    skippedExisting: 0,
    skippedNoCompany: 0,
    errors: 0,
    unmatched: [],
  };

  for (const oldCompany of oldCompanies) {
    let agents;
    try {
      agents = await fetchJson(`${OLD_BASE_URL}/companies/${oldCompany.id}/agents`);
    } catch (error) {
      console.error(`✗ ${oldCompany.slug}: ${error.message}`);
      summary.errors++;
      continue;
    }

    if (!agents.length) continue;

    const target = resolveTargetCompany(oldCompany, newIndex, lpIndex);
    if (!target) {
      summary.skippedNoCompany += agents.length;
      summary.unmatched.push(`${oldCompany.slug} (${oldCompany.name}) — ${agents.length} agente(s)`);
      continue;
    }

    const whatsappInstance =
      lpIndex?.whatsappByLavaiId.get(target.id) ?? null;

    if (SKIP_EXISTING && (await companyHasAgents(lavai, target.id))) {
      console.log(`· ${oldCompany.slug} → ${target.slug} (já tem agente, pulando)`);
      summary.skippedExisting += agents.length;
      continue;
    }

    if (!DRY_RUN && REPLACE && agents.length > 0) {
      await deleteCompanyAgents(lavai, target.id);
    }

    for (const agentSummary of agents) {
      summary.oldAgents++;
      const label = `${oldCompany.slug} → ${target.slug} / ${agentSummary.name}`;

      try {
        const agent = await fetchJson(`${OLD_BASE_URL}/agents/${agentSummary.id}`);

        if (DRY_RUN) {
          console.log(`→ [dry-run] ${label}`);
          summary.imported++;
          continue;
        }

        await lavai.query('BEGIN');
        try {
          const newAgentId = await insertAgent(
            lavai,
            target.id,
            agent,
            whatsappInstance,
          );
          await lavai.query('COMMIT');
          console.log(`✓ ${label} → ${newAgentId}`);
          summary.imported++;
        } catch (error) {
          await lavai.query('ROLLBACK');
          throw error;
        }
      } catch (error) {
        console.error(`✗ ${label}: ${error.message}`);
        summary.errors++;
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('RESUMO');
  console.log('='.repeat(60));
  console.log(`Agentes no ambiente antigo: ${summary.oldAgents}`);
  console.log(`Importados:                   ${summary.imported}`);
  console.log(`Pulados (já existiam):        ${summary.skippedExisting}`);
  console.log(`Sem empresa destino:          ${summary.skippedNoCompany}`);
  console.log(`Erros:                        ${summary.errors}`);

  if (summary.unmatched.length) {
    console.log('\nSem match no lavai-db novo (provavelmente fora do LavPerform):');
    summary.unmatched.forEach((line) => console.log(`  - ${line}`));
  }
  console.log('='.repeat(60));

  await lavai.end();
  if (lavperform) await lavperform.end();

  if (summary.errors > 0) process.exit(1);
}

main().catch((error) => {
  console.error('Erro fatal:', error);
  process.exit(1);
});
