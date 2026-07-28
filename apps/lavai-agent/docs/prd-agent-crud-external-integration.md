# PRD — Integração CRUD e Edição de Agentes em Backend Externo

**Status:** Rascunho  
**Data:** 2026-04-15  
**Autor:** (a preencher)  
**Versão:** 1.0

---

## 1. Contexto e Motivação

O repositório `over-agent` expõe uma API REST completa (NestJS + Prisma + PostgreSQL) para criação, edição e remoção de agentes de conversação. Atualmente **não existe interface administrativa** — toda manipulação é feita via Swagger (`/docs`) ou chamadas diretas à API.

O objetivo deste PRD é especificar o contrato, os fluxos e os requisitos técnicos para que um **backend externo** (BFF, painel admin, plataforma no-code, ou qualquer outro serviço) possa consumir e expor o ciclo completo de CRUD e edição de agentes sem precisar conhecer os detalhes internos do `over-agent`.

---

## 2. Objetivos

| # | Objetivo |
|---|---------|
| O1 | Permitir criação de agentes via integração externa, com validação delegada ao `over-agent` |
| O2 | Permitir leitura de agentes de uma empresa (listagem e detalhe completo com todas as configurações) |
| O3 | Permitir edição de todas as dimensões configuráveis de um agente (base, persona, modelo LLM, memória, mídia, filtros) |
| O4 | Permitir remoção de agentes e de servidores MCP vinculados |
| O5 | Documentar claramente todos os contratos de API para facilitar a implementação no backend externo |
| O6 | Definir estratégia de autenticação entre o backend externo e o `over-agent` |

---

## 3. Fora do Escopo

- Implementação do frontend (UI/UX) — coberta pelo PRD de trace steps
- Mudanças no código do `over-agent` para suportar esta integração (a API já está pronta)
- CRUD de empresas (`/companies`)
- Gestão de knowledge bases
- Execução de agentes / processamento de mensagens
- Monitoramento em tempo real de execuções (trace — PRD separado)

---

## 4. Stakeholders

| Papel | Responsabilidade |
|-------|-----------------|
| Backend externo (consumidor) | Implementar os clients HTTP e expor as funcionalidades ao usuário final |
| Time `over-agent` | Manter a API estável, documentada no Swagger, e disponível |
| Administrador de plataforma | Configurar variáveis de ambiente e permissões de acesso |

---

## 5. Casos de Uso

### UC-01 — Criar Agente

**Ator:** Administrador no backend externo  
**Pré-condição:** Empresa (`companyId`) já existe no `over-agent`  
**Fluxo principal:**

1. Administrador fornece nome, descrição e (opcional) `instanceName` UAZAPI
2. Backend externo envia `POST /companies/:companyId/agents`
3. `over-agent` cria `Agent` + configs padrão (persona, model, memory, media, filter)
4. Backend externo recebe `id` do agente criado e redireciona para edição completa

**Payload de request:**
```json
{
  "name": "Agente Vendas",
  "description": "Assistente de qualificação de leads",
  "instanceName": "vendas-01"
}
```

**Response (201 Created):**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "name": "Agente Vendas",
  "description": "...",
  "active": false,
  "instanceName": "vendas-01",
  "createdAt": "...",
  "updatedAt": "..."
}
```

---

### UC-02 — Listar Agentes de uma Empresa

**Fluxo:** `GET /companies/:companyId/agents`

**Response (200 OK):**
```json
[
  {
    "id": "uuid",
    "name": "Agente Vendas",
    "description": "...",
    "active": true,
    "instanceName": "vendas-01",
    "createdAt": "...",
    "updatedAt": "..."
  }
]
```

---

### UC-03 — Buscar Agente Completo (com todas as configs)

**Fluxo:** `GET /agents/:id`

**Response (200 OK):**
```json
{
  "id": "uuid",
  "companyId": "uuid",
  "name": "...",
  "description": "...",
  "active": true,
  "instanceName": "...",
  "persona": {
    "systemPrompt": "...",
    "welcomeMessage": "...",
    "language": "pt-BR"
  },
  "modelConfig": {
    "provider": "openrouter",
    "model": "openai/gpt-4o",
    "temperature": 0.7,
    "maxTokens": 4096
  },
  "memoryConfig": {
    "enabled": true,
    "maxMessages": 20,
    "ttlSeconds": 86400
  },
  "mediaConfig": {
    "audioEnabled": true,
    "imageEnabled": true,
    "videoEnabled": false
  },
  "filterConfig": {
    "allowedPhones": [],
    "blockedPhones": [],
    "groupsEnabled": false,
    "triggerWords": []
  }
}
```

---

### UC-04 — Editar Dados Base do Agente

**Fluxo:** `PATCH /agents/:id`

**Payload:**
```json
{
  "name": "Novo Nome",
  "description": "Nova descrição",
  "instanceName": "nova-instancia"
}
```

---

### UC-05 — Ativar / Desativar Agente

**Fluxo:** `PATCH /agents/:id/toggle`  
**Body:** vazio — apenas alterna o campo `active`

---

### UC-06 — Editar Persona do Agente

**Fluxo:** `PATCH /agents/:id/persona`

**Payload:**
```json
{
  "systemPrompt": "Você é um assistente especializado em...",
  "welcomeMessage": "Olá! Como posso ajudar?",
  "language": "pt-BR"
}
```

---

### UC-07 — Editar Configuração do Modelo LLM

**Fluxo:** `PATCH /agents/:id/model-config`

**Payload:**
```json
{
  "model": "openai/gpt-4o-mini",
  "temperature": 0.5,
  "maxTokens": 2048
}
```

> **Nota:** A lista de modelos disponíveis pode ser obtida via `GET /llm/models` (retorna modelos do OpenRouter). O backend externo deve consultar este endpoint para popular um select dinamicamente.

---

### UC-08 — Editar Configuração de Memória

**Fluxo:** `PATCH /agents/:id/memory-config`

**Payload:**
```json
{
  "enabled": true,
  "maxMessages": 30,
  "ttlSeconds": 172800
}
```

---

### UC-09 — Editar Configuração de Mídia

**Fluxo:** `PATCH /agents/:id/media-config`

**Payload:**
```json
{
  "audioEnabled": true,
  "imageEnabled": true,
  "videoEnabled": false
}
```

---

### UC-10 — Editar Filtros do Agente

**Fluxo:** `PATCH /agents/:id/filter-config`

**Payload:**
```json
{
  "allowedPhones": ["+5511999999999"],
  "blockedPhones": [],
  "groupsEnabled": false,
  "triggerWords": ["oi", "olá", "ajuda"]
}
```

---

### UC-11 — Remover Agente

**Fluxo:** `DELETE /agents/:id`  
**Response:** `204 No Content`

---

### UC-12 — Gerenciar Servidores MCP do Agente

| Operação | Endpoint |
|----------|----------|
| Criar | `POST /agents/:agentId/mcp-servers` |
| Listar | `GET /agents/:agentId/mcp-servers` |
| Detalhe | `GET /mcp-servers/:id` |
| Editar | `PATCH /mcp-servers/:id` |
| Ativar/desativar | `PATCH /mcp-servers/:id/toggle` |
| Remover | `DELETE /mcp-servers/:id` |

**Payload de criação:**
```json
{
  "name": "Servidor CRM",
  "transport": "sse",
  "url": "https://mcp.meucrm.com/sse",
  "active": true
}
```

---

## 6. Contrato de Autenticação

O `over-agent` **não possui autenticação implementada** na versão atual (sem JWT/API Key nativo). A estratégia recomendada para a integração é:

### Opção A — Rede privada / mTLS (recomendado para produção)
- `over-agent` fica em rede privada (VPC, Docker network, Kubernetes internal service)
- Backend externo acessa via rede interna — sem exposição pública
- Autenticação via mTLS ou IP allowlist no ingress

### Opção B — API Key via Header customizado
- Adicionar middleware no `over-agent` que valida um header `X-Internal-API-Key`
- Backend externo injeta a key via variável de ambiente
- Implementação: guard NestJS global com `@Injectable()` e `canActivate()`

### Opção C — JWT padrão
- Implementar `@nestjs/jwt` no `over-agent` com issuer dedicado para serviços internos
- Backend externo obtém token via `POST /auth/service-token` com `client_credentials`

> **Decisão:** Escolher entre A, B ou C antes de iniciar a implementação. **Opção A é preferida** por não requerer mudanças no código do `over-agent`.

---

## 7. Requisitos Técnicos para o Backend Externo

### 7.1 — Client HTTP

O backend externo deve implementar um client HTTP dedicado com:

```
BaseURL: process.env.OVER_AGENT_API_URL (ex: http://over-agent:3000)
Timeout: 30s (operações de CRUD são rápidas)
Retry: 3 tentativas com backoff exponencial (para erros 5xx)
Content-Type: application/json
```

### 7.2 — Mapeamento de Erros

| Status HTTP | Significado | Ação no backend externo |
|-------------|-------------|------------------------|
| 400 | Validação falhou | Repassar `message[]` ao cliente |
| 404 | Agente/empresa não encontrado | Retornar 404 com mensagem clara |
| 409 | `instanceName` já em uso | Indicar campo duplicado ao cliente |
| 422 | Entidade não processável | Log + erro genérico ao cliente |
| 500 | Erro interno do `over-agent` | Log + alerta (monitoramento) |

### 7.3 — Variáveis de Ambiente Necessárias

```env
# URL base do over-agent
OVER_AGENT_API_URL=http://over-agent:3000

# (Opcional, se usar Opção B)
OVER_AGENT_API_KEY=secret-key-here

# Timeout em milissegundos
OVER_AGENT_HTTP_TIMEOUT_MS=30000
```

### 7.4 — Endpoints Auxiliares

| Endpoint | Uso no backend externo |
|----------|----------------------|
| `GET /llm/models` | Popular select de modelos LLM na edição de agentes |

---

## 8. Fluxos de Integração

### 8.1 — Fluxo de Criação Completa de Agente

```
Backend Externo                         over-agent API
     │                                        │
     │── POST /companies/:cId/agents ────────>│
     │<── 201 { id, name, active:false } ─────│
     │                                        │
     │── PATCH /agents/:id/persona ──────────>│
     │<── 200 OK ─────────────────────────────│
     │                                        │
     │── PATCH /agents/:id/model-config ─────>│
     │<── 200 OK ─────────────────────────────│
     │                                        │
     │── PATCH /agents/:id/memory-config ────>│
     │<── 200 OK ─────────────────────────────│
     │                                        │
     │── PATCH /agents/:id/filter-config ────>│
     │<── 200 OK ─────────────────────────────│
     │                                        │
     │── PATCH /agents/:id/toggle ───────────>│  (ativar)
     │<── 200 OK ─────────────────────────────│
```

### 8.2 — Fluxo de Edição de Agente Existente

```
Backend Externo                         over-agent API
     │                                        │
     │── GET /agents/:id ────────────────────>│  (carregar estado atual)
     │<── 200 { ...agente completo } ─────────│
     │                                        │
     │  (usuário edita campos na UI)          │
     │                                        │
     │── PATCH /agents/:id/<secção> ─────────>│  (apenas a secção alterada)
     │<── 200 OK ─────────────────────────────│
```

> **Boas práticas:** Sempre fazer `GET /agents/:id` antes de exibir o formulário de edição para garantir dados atualizados. Salvar cada secção independentemente (não aguardar que o usuário salve tudo de uma vez).

---

## 9. Modelo de Dados de Referência (Tipos TypeScript)

O backend externo deve declarar as interfaces abaixo para tipagem dos payloads:

```typescript
// Agente base
interface AgentBase {
  id: string;
  companyId: string;
  name: string;
  description?: string;
  active: boolean;
  instanceName?: string;
  createdAt: string;
  updatedAt: string;
}

// Agente completo com todas as configs
interface AgentFull extends AgentBase {
  persona?: AgentPersona;
  modelConfig?: AgentModelConfig;
  memoryConfig?: AgentMemoryConfig;
  mediaConfig?: AgentMediaConfig;
  filterConfig?: AgentFilterConfig;
}

interface AgentPersona {
  systemPrompt?: string;
  welcomeMessage?: string;
  language?: string;
}

interface AgentModelConfig {
  model: string;
  temperature?: number;
  maxTokens?: number;
}

interface AgentMemoryConfig {
  enabled: boolean;
  maxMessages?: number;
  ttlSeconds?: number;
}

interface AgentMediaConfig {
  audioEnabled: boolean;
  imageEnabled: boolean;
  videoEnabled: boolean;
}

interface AgentFilterConfig {
  allowedPhones?: string[];
  blockedPhones?: string[];
  groupsEnabled?: boolean;
  triggerWords?: string[];
}

// MCP Server
interface AgentMcpServer {
  id: string;
  agentId: string;
  name: string;
  transport: 'sse' | 'stdio';
  url?: string;
  command?: string;
  args?: string[];
  active: boolean;
}
```

---

## 10. Estrutura de Módulo Sugerida (Backend Externo)

```
src/
  agents/
    agents.module.ts           # NestJS module (ou equivalente no framework)
    agents.controller.ts       # Expõe rotas ao frontend
    agents.service.ts          # Orquestra chamadas ao over-agent
    agents.client.ts           # HttpClient encapsulando fetch/axios para over-agent
    dto/
      create-agent.dto.ts
      update-agent-base.dto.ts
      update-agent-persona.dto.ts
      update-agent-model-config.dto.ts
      update-agent-memory-config.dto.ts
      update-agent-media-config.dto.ts
      update-agent-filter-config.dto.ts
    types/
      agent.types.ts            # Interfaces TypeScript acima
  mcp-servers/
    mcp-servers.client.ts
    mcp-servers.service.ts
```

---

## 11. Critérios de Aceite

| ID | Critério |
|----|---------|
| CA-01 | Backend externo consegue criar um agente e receber seu `id` |
| CA-02 | Backend externo consegue listar todos os agentes de uma empresa |
| CA-03 | Backend externo consegue buscar um agente com todas as configurações populadas |
| CA-04 | Backend externo consegue atualizar cada secção de configuração independentemente |
| CA-05 | Backend externo consegue ativar e desativar um agente |
| CA-06 | Backend externo consegue deletar um agente |
| CA-07 | Backend externo consegue criar, listar, editar e deletar servidores MCP de um agente |
| CA-08 | Erros de validação do `over-agent` são propagados corretamente ao cliente final |
| CA-09 | A integração funciona sem expor o `over-agent` diretamente à internet (rede privada ou API Key) |
| CA-10 | Lista de modelos LLM disponíveis é carregada dinamicamente via `GET /llm/models` |

---

## 12. Riscos e Mitigações

| Risco | Impacto | Mitigação |
|-------|---------|-----------|
| `over-agent` sem autenticação exposto à internet | Alto | Implementar rede privada (Opção A) antes de ir para produção |
| Mudanças de contrato na API do `over-agent` | Médio | Versionar a API (`/v1/`) ou usar Swagger contract testing |
| Latência alta em operações de CRUD | Baixo | Operações são leves; timeout de 30s é suficiente |
| `instanceName` único por agente conflita em ambientes dev/prod | Médio | Usar prefixos de ambiente (ex: `dev-vendas-01`) |
| Falta de paginação na listagem de agentes | Médio | Monitorar tamanho da resposta; solicitar paginação ao time do `over-agent` se necessário |

---

## 13. Cronograma Sugerido

| Fase | Entregável | Estimativa |
|------|-----------|------------|
| F1 | Configurar client HTTP + autenticação (Opção A/B/C) | 1 dia |
| F2 | CRUD base de agentes (create, list, get, delete, toggle) | 2 dias |
| F3 | Edição de todas as secções de configuração | 2 dias |
| F4 | CRUD de MCP Servers | 1 dia |
| F5 | Testes de integração e tratamento de erros | 1 dia |
| **Total** | | **~7 dias** |

---

## 14. Referências

- Swagger do `over-agent`: `http://<host>:3000/docs`
- PRD de trace steps frontend: `docs/prd-agent-trace-steps-frontend.md`
- Schema Prisma: `prisma/schema.prisma`
- Controller principal de agentes: `src/infrastructure/http/agent/agent.controller.ts`
- Controller de MCP: `src/infrastructure/http/mcp/mcp-server.controller.ts`
- Variáveis de ambiente: `.env.example`
