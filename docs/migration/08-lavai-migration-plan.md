# 08 — Plano de migração LavAI

## Matriz de rename (FoodAI → LavAI)

| De | Para | Escopo |
|----|------|--------|
| FoodAI | LavAI | UI, docs, títulos |
| food-ai | lavai | paths, scripts, env |
| foodai | lavai | identifiers, Electron appId |
| over-agent | lavai-agent | package, Docker, Swagger |
| Over Agent | LavAI Agent | docs, logs |
| `com.foodai.client` | `com.lavperform.lavai` | Electron |
| `OVER_AGENT_BASE_URL` | `LAVAI_AGENT_BASE_URL` | env (alias deprecated mantido) |
| `OverAgentApiService` | `LavaiAgentApiService` | BFF (alias deprecated) |

## Workspaces finais

```
apps/
  lavai-agent/       @lavperform/lavai-agent
  lavai-dashboard/   @lavperform/lavai-dashboard
  lavai-client/      @lavperform/lavai-client
```

## Sprints

1. Estrutura monorepo + Yarn workspaces
2. Branding WhiteLabel
3. Build motor + docker-compose + porta 3000
4. BFF: knowledge proxy + LavaiAgentApiService
5. Dashboard admin
6. Client Electron
7. CI/CD + docs infra
8. Testes e hardening

## Compatibilidade

- `OVER_AGENT_BASE_URL` continua aceito no BFF como fallback de `LAVAI_AGENT_BASE_URL`
- `window.foodAi` mantido como alias deprecated no preload Electron

## Validação por sprint

Cada sprint termina com: `yarn build:*`, TypeScript OK, ENV documentadas, imports validados.
