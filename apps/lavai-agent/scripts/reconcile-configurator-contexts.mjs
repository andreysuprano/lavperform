/**
 * Reaplica instruções/propostas pendentes do configurador.
 *
 * Uso — todos os agentes com histórico no configurador:
 *   LAVAI_AGENT_URL=https://... node scripts/reconcile-configurator-contexts.mjs
 *
 * Uso — lista manual:
 *   RECONCILE_PAIRS='[{"targetAgentId":"...","contextCompanyId":"..."}]' node ...
 *
 * No deploy, prefira CONFIGURATOR_RECONCILE_ON_BOOT=true uma vez ou POST /agent-configurator/reconcile-all
 */

const base = process.env.LAVAI_AGENT_URL ?? 'http://localhost:3001';

async function reconcile(targetAgentId, contextCompanyId) {
  const response = await fetch(`${base}/agent-configurator/reconcile`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ targetAgentId, contextCompanyId }),
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${targetAgentId}: ${response.status} ${text}`);
  }
  return response.json();
}

async function reconcileAll() {
  const response = await fetch(`${base}/agent-configurator/reconcile-all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`reconcile-all: ${response.status} ${text}`);
  }
  return response.json();
}

const pairsJson = process.env.RECONCILE_PAIRS?.trim();
if (!pairsJson) {
  const summary = await reconcileAll();
  console.log(JSON.stringify(summary, null, 2));
  process.exit(0);
}

const pairs = JSON.parse(pairsJson);
if (pairs.length === 0) {
  console.error(
    'Defina RECONCILE_PAIRS como JSON não vazio ou omita para reconcile-all',
  );
  process.exit(1);
}

for (const row of pairs) {
  const result = await reconcile(row.targetAgentId, row.contextCompanyId);
  console.log(JSON.stringify(result));
}