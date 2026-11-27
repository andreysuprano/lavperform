# Reprocessar todas as IAs (configurador + ficha)

## Opção A — automatico no deploy (uma vez, recomendado)

No release da **api-lavperform** (ficha + dispara reconcile no LavAI):

```env
LAVPERFORM_REPROCESS_AI_AGENTS_ON_BOOT=true
```

Alternativa só configurador no **lavai-agent**:

```env
CONFIGURATOR_RECONCILE_ON_BOOT=true
```

Confira logs, **remova a variável** no próximo deploy.

## Opção B — admin (recomendado pós-release)

Com token do **painel admin**:

```http
POST /admin/ai-agents/reprocess-all
Authorization: Bearer <admin-jwt>
```

Resposta:

- `configurator.changed` — agentes cujo contexto veio do histórico do chat
- `sheets.changed` — agentes cuja ficha entrou no contexto

## Opção C — somente LavAI (rede interna)

```bash
LAVAI_AGENT_URL=https://<lavai-agent-interno> \
  node apps/lavai-agent/scripts/reconcile-configurator-contexts.mjs
```

## Limitações

- Não recupera o que só existiu na resposta da IA sem texto recuperável no histórico do usuário.
- Empresas que nunca abriram o configurador só entram no passo da **ficha** (opção B).