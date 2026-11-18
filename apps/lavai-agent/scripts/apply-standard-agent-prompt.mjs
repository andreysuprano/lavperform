import { createRequire } from 'node:module';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { Client } = require('pg');
const {
  conductForServiceModel,
  documentFromBackup,
  migratePersonaPrompt,
  missingAgentIds,
  serviceTemplateFor,
} = await import('../src/application/agent-configurator/migrate-persona-prompt.ts');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const envPath = join(scriptDir, '../.env');
if (existsSync(envPath)) {
  const { config: loadEnv } = require('dotenv');
  loadEnv({ path: envPath });
}

const args = process.argv.slice(2);
const apply = args.includes('--apply');
const revertIndex = args.indexOf('--revert');
const revertPath = revertIndex >= 0 ? args[revertIndex + 1] : null;

const SELECT = `
  SELECT a.id AS agent_id, c.id AS lavai_company_id, c.name AS company_name, a.name AS agent_name,
         coalesce(p.system_prompt, '') AS system_prompt,
         coalesce(p.behavior_guidelines, '') AS behavior_guidelines,
         coalesce(p.guardrails, '') AS guardrails,
         coalesce(p.context_prompt, '') AS context_prompt
  FROM agent_personas p
  JOIN agents a ON a.id = p.agent_id
  JOIN companies c ON c.id = a.company_id
  WHERE a.kind::text = 'PUBLIC' AND a.platform_code IS NULL
  ORDER BY c.name, a.name
`;

function envValue(file, key) {
  if (!existsSync(file)) return '';
  const line = readFileSync(file, 'utf8')
    .split(/\r?\n/)
    .find((entry) => entry.startsWith(key + '='));
  if (!line) return '';
  return line.slice(key.length + 1).replace(/^["']|["']$/g, '');
}

function cadastroModel(rows) {
  const active = rows.filter((row) => !row.deleted);
  const pool = active.length > 0 ? active : rows;
  if (pool.some((row) => row.model === 'SELF_SERVICE')) return 'SELF_SERVICE';
  if (pool.some((row) => row.model === 'CONVENTIONAL')) return 'CONVENTIONAL';
  return null;
}

function rowToCurrent(row) {
  return {
    systemPrompt: row.system_prompt,
    behaviorGuidelines: row.behavior_guidelines,
    guardrails: row.guardrails,
    contextPrompt: row.context_prompt,
  };
}

function backupPersona(row) {
  return {
    agentId: row.agent_id,
    companyName: row.company_name,
    agentName: row.agent_name,
    ...rowToCurrent(row),
  };
}

function stamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return [
    now.getFullYear(),
    pad(now.getMonth() + 1),
    pad(now.getDate()),
    '-',
    pad(now.getHours()),
    pad(now.getMinutes()),
    pad(now.getSeconds()),
  ].join('');
}

async function withClient(work) {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    console.error('DATABASE_URL não definido (lavai-db).');
    process.exit(1);
  }
  const client = new Client({ connectionString: databaseUrl });
  await client.connect();
  try {
    return await work(client);
  } finally {
    await client.end();
  }
}

async function writeUpdates(client, updates) {
  await client.query('BEGIN');
  try {
    for (const update of updates) {
      await client.query(
        `UPDATE agent_personas
         SET system_prompt = $1, behavior_guidelines = $2, guardrails = $3, context_prompt = $4, updated_at = now()
         WHERE agent_id = $5`,
        [
          update.systemPrompt,
          update.behaviorGuidelines,
          update.guardrails,
          update.contextPrompt,
          update.agentId,
        ],
      );
    }
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  }
}

function printPlan(lines) {
  for (const line of lines) console.log(line);
  console.log(`Total: ${lines.length}`);
}

async function revert() {
  if (!revertPath) {
    console.error('Informe o arquivo: --revert scripts/backups/prompt-padrao-....json');
    process.exit(1);
  }
  const backup = JSON.parse(readFileSync(revertPath, 'utf8'));
  const personas = backup.personas ?? [];
  await withClient(async (client) => {
    const existing = await client.query('SELECT id FROM agents WHERE id = ANY($1::uuid[])', [
      personas.map((persona) => persona.agentId),
    ]);
    const missing = missingAgentIds(
      personas.map((persona) => persona.agentId),
      existing.rows.map((row) => row.id),
    );
    if (missing.length > 0) {
      console.error('Agentes ausentes. Nada foi gravado.');
      for (const id of missing) console.error(id);
      process.exit(1);
    }
    const lines = personas.map(
      (persona) => `${persona.companyName} | ${persona.agentName} | contexto ${persona.contextPrompt.length}`,
    );
    printPlan(lines);
    if (!apply) {
      console.log('Dry-run da reversão. Nada foi gravado. Use --apply para gravar.');
      return;
    }
    await writeUpdates(
      client,
      personas.map((persona) => ({ agentId: persona.agentId, ...documentFromBackup(persona) })),
    );
    console.log(`Revertido a partir de ${revertPath}`);
  });
}

async function migrate() {
  const template = readFileSync(
    join(scriptDir, '../src/application/agent-configurator/prompts/whatsapp-agent.prompt.md'),
    'utf8',
  );
  const backupPath = join(scriptDir, 'backups/prompt-padrao-20261118-113409.json');
  const previous = new Map(
    JSON.parse(readFileSync(backupPath, 'utf8')).personas.map((persona) => [
      persona.agentId,
      [persona.systemPrompt, persona.behaviorGuidelines, persona.guardrails, persona.contextPrompt].join('\n'),
    ]),
  );
  const apiUrl = envValue(join(scriptDir, '../../api-lavperform/.env'), 'DATABASE_URL');
  if (!apiUrl) {
    console.error('DATABASE_URL não definido (api-lavperform).');
    process.exit(1);
  }
  const api = new Client({ connectionString: apiUrl });
  await api.connect();
  let companies;
  try {
    companies = await api.query(
      `SELECT "overAgentCompanyId"::text AS lavai_id, "serviceModel"::text AS model, "deletedAt" IS NOT NULL AS deleted
       FROM "Company"`,
    );
  } finally {
    await api.end();
  }
  const byLavai = new Map();
  for (const row of companies.rows) {
    if (!row.lavai_id) continue;
    const list = byLavai.get(row.lavai_id) || [];
    list.push(row);
    byLavai.set(row.lavai_id, list);
  }
  await withClient(async (client) => {
    const result = await client.query(SELECT);
    const updates = result.rows.map((row) => {
      const model = serviceTemplateFor({
        serviceModel: cadastroModel(byLavai.get(row.lavai_company_id) || []),
        previousText: previous.get(row.agent_id) || '',
      });
      const next = migratePersonaPrompt(rowToCurrent(row), conductForServiceModel(template, model));
      if (next.contextPrompt !== row.context_prompt) {
        throw new Error(`Contexto mudaria em ${row.company_name}`);
      }
      return {
        agentId: row.agent_id,
        companyName: row.company_name,
        agentName: row.agent_name,
        model,
        ...next,
      };
    });
    printPlan(updates.map((update) => `${update.companyName} | ${update.agentName} | ${update.model}`));
    if (!apply) {
      console.log('Dry-run. Nada foi gravado. Use --apply para gravar.');
      return;
    }
    const dir = join(scriptDir, 'backups');
    mkdirSync(dir, { recursive: true });
    const file = join(dir, `prompt-padrao-${stamp()}.json`);
    const payload = {
      createdAt: new Date().toISOString(),
      personas: result.rows.map(backupPersona),
    };
    writeFileSync(file, JSON.stringify(payload, null, 2));
    await writeUpdates(client, updates);
    console.log(`Backup: ${file}`);
  });
}

const run = revertPath ? revert() : migrate();
run.catch((error) => {
  console.error(error.message);
  process.exit(1);
});
