# LavAI — Infraestrutura

## Stack

| Serviço | Imagem / App | Porta dev |
|---------|--------------|-----------|
| Motor IA | `@lavperform/lavai-agent` | 3000 |
| Dashboard ops | `@lavperform/lavai-dashboard` | 3002 |
| Client desktop | `@lavperform/lavai-client` | Electron |
| BFF CRM | `@lavperform/api` | (app existente) |

## Dependências externas

- **PostgreSQL 16 + pgvector** — dados do motor (agents, RAG, traces)
- **Redis 7** — BullMQ (webhook, knowledge-ingest, follow-up)
- **OpenAI API** — embeddings, Whisper, Vision
- **OpenRouter API** — LLM chat
- **UAZAPI** — WhatsApp

## Dev local (motor)

```bash
cd apps/lavai-agent
cp .env.example .env
# Ajuste OPENAI_API_KEY, OPENROUTER_API_KEY, UAZAPI_API_KEY

docker compose up -d postgres redis
yarn workspace @lavperform/lavai-agent prisma:migrate
yarn dev:lavai-agent
```

## ENV BFF (`api-lavperform`)

```env
LAVAI_AGENT_BASE_URL=http://localhost:3000
LAVAI_AGENT_WEBHOOK_BASE_URL=http://localhost:3000
# deprecated alias:
OVER_AGENT_BASE_URL=http://localhost:3000
```

## ENV Dashboard

```env
# Build time (Next.js) — obrigatório antes do npm run build
NEXT_PUBLIC_API_URL=https://development-lav-ai.eefvku.easypanel.host
```

Definir `NEXT_PUBLIC_API_URL` só em runtime no Easypanel **não surte efeito**; use build arg no deploy.

## CI

Jobs `lavai-agent` e `lavai-dashboard` no workflow `.github/workflows/ci.yml`.

## Segurança

O motor LavAI **não tem auth global**. Em produção:

- Expor apenas na rede privada / VPC
- BFF (`api-lavperform`) como único ponto público autenticado
- Dashboard protegido (reverse proxy com auth ou integração admin LavPerform)
