# 05 — Inventário FoodAI → LavAI

## Status: DESBLOQUEADO

**Repositório fonte:** `andreysuprano/FoodAI`  
**Commit de referência:** `45c3a57baa6fc401c23dcdbee07d817266fecb06`  
**Clone local:** `C:\Users\Sherlock\repos\FoodAI`

## Estrutura do FoodAI (3 apps independentes)

| App origem | Destino LavPerform | Pacote | Stack |
|------------|-------------------|--------|-------|
| `food-agent` | `apps/lavai-agent` | `@lavperform/lavai-agent` | NestJS 11, Prisma 7, PostgreSQL+pgvector, Redis/BullMQ |
| `agents-dashboard` | `apps/lavai-dashboard` | `@lavperform/lavai-dashboard` | Next.js 16, React 19 |
| `food-ai-client` | `apps/lavai-client` | `@lavperform/lavai-client` | Electron 34, React 19 |

## Motor de IA (`food-agent` / over-agent)

- **LLM:** OpenRouter (chat + tools loop)
- **Embeddings/Whisper/Vision:** OpenAI direto
- **RAG:** KnowledgeBase + KnowledgeChunk com pgvector
- **Tools:** `search_knowledge`, `get_datetime`, `end_conversation`, `request_human_help`
- **MCP:** STDIO + SSE via `@modelcontextprotocol/sdk`
- **WhatsApp:** UAZAPI webhook inbound/outbound
- **Filas BullMQ:** `webhook`, `knowledge-ingest`, `follow-up`
- **WebSockets:** `/attendant` (Electron), `/agent-trace` (dashboard)
- **Auth:** sem auth global; `X-Internal-API-Key` no webhook `purchase-complete`

## APIs principais

- `POST/GET /companies`, `/companies/:id/agents`
- Configs: persona, model, memory, media, filter, journey
- `GET/POST /companies/:companyId/knowledge-bases` + ingest
- MCP servers CRUD
- `POST /webhooks/:companyId/:agentId`
- `GET /agent-runs`, `POST .../purchase-complete`
- `GET /llm/models`

## Integração com LavPerform existente

O `api-lavperform` já consome este motor via `OVER_AGENT_BASE_URL` (`OverAgentApiService`).
O CRM `lavperform-app` já tem UI whitelabel em `/whitelabel/ai-agent`.

**Gaps:** motor fora do monorepo; knowledge-files no BFF sem implementação; dashboard e client Electron ausentes.

## ENV obrigatórias (motor)

Ver `apps/lavai-agent/.env.example`: `DATABASE_URL`, `REDIS_URL`, `OPENAI_API_KEY`, `OPENROUTER_API_KEY`, `UAZAPI_API_KEY`.

## Documentação relacionada

- [08-lavai-migration-plan.md](./08-lavai-migration-plan.md) — matriz de rename e sprints
- [docs/infra/lavai.md](../infra/lavai.md) — infra de deploy
