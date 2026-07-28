# PRD — Guia de Integração via API: Companies, Agents e MCP Servers

**Produto:** Over Agent — API REST  
**Versão:** 1.0  
**Data:** Abril 2026  
**Status:** Pronto para implementação  
**Público-alvo:** Times de backend externo que querem integrar com o Over Agent

---

## 1. Visão Geral

O **Over Agent** expõe uma API REST completa (NestJS + Prisma + PostgreSQL) que permite a sistemas externos gerenciar todo o ciclo de vida de:

- **Companies** — tenants que agrupam agentes e recursos
- **Agents** — bots de conversação com configurações detalhadas de persona, modelo LLM, memória, mídia e filtros
- **MCP Servers** — servidores de ferramentas externas (Model Context Protocol) vinculados a agentes

Este guia descreve o **fluxo passo a passo** para um sistema externo (BFF, painel admin, plataforma no-code, etc.) criar uma company, provisionar agentes completos e integrá-los ao Over Agent.

---

## 2. Pré-requisitos

| Item | Descrição |
|------|-----------|
| `OVER_AGENT_BASE_URL` | URL base da API (ex: `http://over-agent:3000`) |
| Acesso de rede | O sistema externo deve ter acesso à rede onde o Over Agent está rodando |
| `Content-Type` | Todas as requisições devem usar `application/json` |
| Swagger | Documentação interativa disponível em `{BASE_URL}/docs` |

---

## 3. Autenticação

O Over Agent **não possui autenticação nativa** na versão atual. Utilize uma das estratégias abaixo:

### Opção A — Rede privada (recomendado para produção)
O Over Agent fica em rede privada (VPC, Docker network, Kubernetes internal service) e o sistema externo acessa via rede interna, sem exposição pública.

### Opção B — API Key via header customizado
Adicionar um middleware no Over Agent que valida um header `X-Internal-API-Key`. O sistema externo injeta a key via variável de ambiente.

### Opção C — JWT padrão
Implementar `@nestjs/jwt` com `client_credentials` para serviços internos.

> **Recomendação:** Usar a Opção A em produção. A Opção B é mais simples para ambientes de desenvolvimento compartilhado.

---

## 4. Hierarquia de Entidades

```
Company (tenant)
  └── Agent (bot de conversação)
        ├── AgentPersona       (personalidade e prompts)
        ├── AgentModelConfig   (parâmetros do LLM)
        ├── AgentMemoryConfig  (configuração de memória/contexto)
        ├── AgentMediaConfig   (processamento de áudio, imagem e vídeo)
        ├── AgentFilterConfig  (filtros de roteamento de mensagens)
        └── AgentMcpServer[]   (ferramentas MCP externas)
```

---

## 5. Fluxo Completo: Criar uma Company e seus Agentes

### Diagrama de sequência

```
Sistema Externo                          Over Agent API
      │                                        │
      │══ ETAPA 1: Criar Company ══════════════│
      │── POST /companies ─────────────────────>│
      │<── 201 { id, name, slug, ... } ─────────│
      │                                        │
      │══ ETAPA 2: Criar Agente ═══════════════│
      │── POST /companies/:companyId/agents ───>│
      │<── 201 { id, name, active:false, ... } ─│
      │                                        │
      │══ ETAPA 3: Configurar Persona ══════════│
      │── PATCH /agents/:id/persona ───────────>│
      │<── 200 { personaName, systemPrompt... } ─│
      │                                        │
      │══ ETAPA 4: Configurar Modelo LLM ═══════│
      │── PATCH /agents/:id/model-config ──────>│
      │<── 200 { modelName, temperature, ... } ─│
      │                                        │
      │══ ETAPA 5: Configurar Memória ══════════│
      │── PATCH /agents/:id/memory-config ─────>│
      │<── 200 { memoryType, windowSize, ... } ─│
      │                                        │
      │══ ETAPA 6: Configurar Mídia ════════════│
      │── PATCH /agents/:id/media-config ──────>│
      │<── 200 { audioEnabled, ... } ───────────│
      │                                        │
      │══ ETAPA 7: Configurar Filtros ══════════│
      │── PATCH /agents/:id/filter-config ─────>│
      │<── 200 { allowedPhones, ... } ──────────│
      │                                        │
      │══ ETAPA 8: Adicionar MCP Servers ═══════│
      │── POST /agents/:id/mcp-servers ────────>│
      │<── 201 { id, name, transport, ... } ────│
      │                                        │
      │══ ETAPA 9: Ativar Agente ═══════════════│
      │── PATCH /agents/:id/toggle ────────────>│
      │<── 200 { active: true } ────────────────│
```

---

## 6. ETAPA 1 — Criar Company

### Endpoint

```
POST /companies
```

### Request Body

```json
{
  "name": "Acme Corp",
  "slug": "acme-corp",
  "email": "contato@acme.com",
  "phone": "+5511999999999"
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome da empresa |
| `slug` | string | ✅ | Identificador único — apenas letras minúsculas, números e hífens (ex: `acme-corp`) |
| `email` | string | ❌ | E-mail de contato da empresa |
| `phone` | string | ❌ | Telefone no formato E.164 (ex: `+5511999999999`) |

### Response 201

```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Acme Corp",
  "slug": "acme-corp",
  "email": "contato@acme.com",
  "phone": "+5511999999999",
  "active": true,
  "createdAt": "2026-04-19T10:00:00.000Z",
  "updatedAt": "2026-04-19T10:00:00.000Z"
}
```

### Erros possíveis

| Status | Motivo |
|--------|--------|
| 400 | `name` ou `slug` ausentes, ou `slug` com caracteres inválidos |
| 409 | `slug` já em uso por outra empresa |

> **Guarde o `id` retornado** — ele é o `companyId` necessário para criar agentes.

---

## 7. ETAPA 2 — Criar Agente

### Endpoint

```
POST /companies/:companyId/agents
```

### Request Body

```json
{
  "name": "Aria Atendimento",
  "description": "Agente de atendimento ao cliente para o canal WhatsApp",
  "instanceName": "acme-atendimento-01",
  "persona": {
    "personaName": "Aria",
    "systemPrompt": "Você é Aria, assistente virtual da Acme Corp. Responda de forma cordial e objetiva.",
    "welcomeMessage": "Olá! Sou a Aria. Como posso ajudar?",
    "voiceTone": "FRIENDLY",
    "communicationStyle": "BALANCED",
    "language": "PT_BR"
  },
  "modelConfig": {
    "modelName": "openai/gpt-4o",
    "temperature": 0.7,
    "maxTokens": 1024
  },
  "memoryConfig": {
    "memoryType": "BUFFER",
    "windowSize": 10
  }
}
```

### Campos do agente base

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome interno do agente |
| `description` | string | ❌ | Descrição do propósito do agente |
| `instanceName` | string | ❌ | Nome único da instância WhatsApp (UAZAPI). Vincula o agente a um número. Deve ser único no sistema. |
| `persona` | objeto | ❌ | Configurações de persona (pode ser feito depois via PATCH) |
| `modelConfig` | objeto | ❌ | Configurações do LLM (pode ser feito depois via PATCH) |
| `memoryConfig` | objeto | ❌ | Configurações de memória (pode ser feito depois via PATCH) |

### Response 201

```json
{
  "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Aria Atendimento",
  "description": "Agente de atendimento ao cliente para o canal WhatsApp",
  "active": false,
  "instanceName": "acme-atendimento-01",
  "persona": { ... },
  "modelConfig": { ... },
  "memoryConfig": { ... },
  "createdAt": "2026-04-19T10:01:00.000Z",
  "updatedAt": "2026-04-19T10:01:00.000Z"
}
```

### Erros possíveis

| Status | Motivo |
|--------|--------|
| 400 | `name` ausente ou payload inválido |
| 404 | `companyId` não encontrado |
| 409 | `instanceName` já em uso por outro agente |

> **Nota:** O agente é criado com `active: false` por padrão. Ative-o somente após concluir todas as configurações (Etapa 9).

---

## 8. ETAPA 3 — Configurar Persona

### Endpoint

```
PATCH /agents/:id/persona
```

Define a identidade e o comportamento conversacional do agente.

### Request Body

```json
{
  "personaName": "Aria",
  "personaDescription": "Assistente virtual especializado em atendimento ao cliente",
  "systemPrompt": "Você é Aria, uma assistente virtual da Acme Corp. Responda de forma cordial e objetiva. Sempre se apresente pelo nome.",
  "behaviorGuidelines": "Sempre se apresente pelo nome. Nunca prometa prazos sem consultar a equipe.",
  "guardrails": "Nunca forneça informações financeiras detalhadas. Não discuta concorrentes.",
  "contextPrompt": "A Acme Corp é uma empresa de tecnologia fundada em 2010, especializada em software B2B.",
  "welcomeMessage": "Olá! Sou a Aria da Acme Corp. Como posso ajudar você hoje?",
  "messageSignature": "_Atenciosamente, Aria 🤖_",
  "voiceTone": "FRIENDLY",
  "communicationStyle": "BALANCED",
  "language": "PT_BR"
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `personaName` | string | Nome pelo qual o agente se apresenta |
| `personaDescription` | string | Descrição interna (não exposta ao usuário) |
| `systemPrompt` | string | Prompt principal injetado no LLM — define o papel do agente |
| `behaviorGuidelines` | string | Regras de comportamento e conduta |
| `guardrails` | string | O que o agente **não** deve fazer |
| `contextPrompt` | string | Contexto do negócio/domínio injetado no prompt |
| `welcomeMessage` | string | Mensagem enviada ao iniciar uma conversa |
| `messageSignature` | string | Texto fixo adicionado ao final de todas as mensagens |
| `voiceTone` | enum | Tom de voz: `FORMAL`, `INFORMAL`, `FRIENDLY`, `PROFESSIONAL`, `EMPATHETIC`, `ASSERTIVE` |
| `communicationStyle` | enum | Estilo: `CONCISE`, `DETAILED`, `TECHNICAL`, `SIMPLIFIED`, `BALANCED` |
| `language` | enum | Idioma: `PT_BR`, `EN_US`, `ES_ES` |

---

## 9. ETAPA 4 — Configurar Modelo LLM

### Endpoint

```
PATCH /agents/:id/model-config
```

### Request Body

```json
{
  "modelName": "openai/gpt-4o",
  "temperature": 0.7,
  "maxTokens": 1024,
  "topP": 1.0,
  "frequencyPenalty": 0.0,
  "presencePenalty": 0.0,
  "streaming": false
}
```

### Campos

| Campo | Tipo | Limites | Descrição |
|-------|------|---------|-----------|
| `modelName` | string | — | Slug do modelo no OpenRouter (ex: `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`). Use `GET /llm/models` para listar os disponíveis. |
| `temperature` | number | 0.0 – 2.0 | Criatividade das respostas (0 = determinístico, 2 = muito criativo) |
| `maxTokens` | integer | 1 – 16384 | Máximo de tokens na resposta |
| `topP` | number | 0.0 – 1.0 | Nucleus sampling |
| `frequencyPenalty` | number | -2.0 – 2.0 | Penalidade de frequência |
| `presencePenalty` | number | -2.0 – 2.0 | Penalidade de presença |
| `streaming` | boolean | — | Ativa streaming de tokens |

> **Como listar modelos disponíveis:**
> ```
> GET /llm/models
> ```
> Retorna a lista de modelos disponíveis no OpenRouter. Use para popular um select dinamicamente no sistema externo.

---

## 10. ETAPA 5 — Configurar Memória

### Endpoint

```
PATCH /agents/:id/memory-config
```

### Request Body

```json
{
  "memoryType": "BUFFER",
  "windowSize": 10,
  "maxSummaryTokens": 2000,
  "useLongTermMemory": false
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `memoryType` | enum | Tipo de memória: `BUFFER` (janela de mensagens), `SUMMARY` (resumo comprimido), `VECTOR` (busca semântica), `NONE` (sem memória) |
| `windowSize` | integer (1–100) | Número de mensagens mantidas no contexto (apenas `BUFFER`) |
| `maxSummaryTokens` | integer | Tokens máximos no resumo comprimido (apenas `SUMMARY`) |
| `useLongTermMemory` | boolean | Habilita memória de longo prazo via vector store |

### Tipos de memória recomendados

| Caso de uso | Tipo recomendado |
|-------------|-----------------|
| Atendimento simples (FAQ) | `BUFFER` com `windowSize: 5` |
| Conversas longas / suporte técnico | `SUMMARY` |
| Assistente pessoal com histórico persistente | `VECTOR` + `useLongTermMemory: true` |
| Agente stateless (cada mensagem é independente) | `NONE` |

---

## 11. ETAPA 6 — Configurar Mídia

### Endpoint

```
PATCH /agents/:id/media-config
```

### Request Body

```json
{
  "audioEnabled": true,
  "audioDefaultMessage": "Desculpe, não consigo processar mensagens de áudio. Por favor, envie sua mensagem em texto.",
  "imageEnabled": true,
  "imageExtractionPrompt": "Descreva detalhadamente o conteúdo da imagem: objetos, texto visível, cores e contexto.",
  "imageDefaultMessage": "Desculpe, não consigo processar imagens.",
  "videoEnabled": false,
  "videoExtractionPrompt": "Analise o frame do vídeo e descreva o conteúdo: cena, pessoas, objetos e texto visível.",
  "videoDefaultMessage": "Desculpe, não consigo processar vídeos."
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `audioEnabled` | boolean | Habilita transcrição de áudio via Whisper (OpenAI) |
| `audioDefaultMessage` | string | Mensagem enviada quando áudio está desabilitado |
| `imageEnabled` | boolean | Habilita interpretação de imagens via GPT-4o Vision |
| `imageExtractionPrompt` | string | Prompt usado para extrair informações da imagem |
| `imageDefaultMessage` | string | Mensagem enviada quando imagens estão desabilitadas |
| `videoEnabled` | boolean | Habilita interpretação de vídeos via GPT-4o Vision (thumbnail) |
| `videoExtractionPrompt` | string | Prompt usado para extrair informações do vídeo |
| `videoDefaultMessage` | string | Mensagem enviada quando vídeos estão desabilitados |

---

## 12. ETAPA 7 — Configurar Filtros

### Endpoint

```
PATCH /agents/:id/filter-config
```

Define quais mensagens e usuários o agente processa.

### Request Body

```json
{
  "allowedPhones": ["5541999990001", "5511988887777"],
  "allowedGroups": [],
  "triggerEnabled": false,
  "triggerWords": ["@aria", "ajuda", "/start"],
  "triggerCaseSensitive": false,
  "triggerRemoveFromText": true
}
```

### Campos

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `allowedPhones` | string[] | Lista de telefones permitidos (formato sem `+`). Vazio = aceita qualquer número. |
| `allowedGroups` | string[] | Lista de `chatId` de grupos WhatsApp permitidos. Vazio = aceita qualquer grupo. |
| `triggerEnabled` | boolean | Se `true`, o agente só responde quando encontrar uma das `triggerWords` no texto/transcrição/legenda |
| `triggerWords` | string[] | Palavras ou frases que ativam o agente (basta uma coincidir) |
| `triggerCaseSensitive` | boolean | Se `true`, a comparação do gatilho diferencia maiúsculas/minúsculas |
| `triggerRemoveFromText` | boolean | Se `true`, remove a trigger word do texto antes de enviar ao agente |

### Comportamento dos filtros

```
Mensagem recebida
    │
    ├─► allowedPhones vazio? → aceita qualquer remetente
    │   allowedPhones preenchido? → verifica se remetente está na lista
    │
    ├─► allowedGroups vazio? → aceita qualquer grupo
    │   allowedGroups preenchido? → verifica se chatId do grupo está na lista
    │
    └─► triggerEnabled = false? → processa todas as mensagens filtradas
        triggerEnabled = true? → processa apenas se contém triggerWord
```

---

## 13. ETAPA 8 — Adicionar MCP Servers (ferramentas externas)

MCP Servers permitem estender o agente com ferramentas externas (CRM, banco de dados, APIs, sistema de arquivos, etc.).

### Endpoint

```
POST /agents/:agentId/mcp-servers
```

### Tipo STDIO (processo local)

Ideal para ferramentas locais executadas como subprocesso:

```json
{
  "name": "Filesystem",
  "transport": "STDIO",
  "enabled": true,
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

### Tipo SSE (servidor remoto via HTTP)

Ideal para integrar com serviços externos expostos via HTTP:

```json
{
  "name": "CRM Integration",
  "transport": "SSE",
  "enabled": true,
  "url": "https://mcp.meucrm.com/sse",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

### Campos

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome de exibição do servidor |
| `transport` | enum | ✅ | `STDIO` ou `SSE` |
| `enabled` | boolean | ❌ | Padrão: `true`. Desabilitados não são conectados nas execuções. |
| `command` | string | Se STDIO | Executável a lançar (ex: `npx`, `python`) |
| `args` | string[] | ❌ | Argumentos do comando |
| `env` | object | ❌ | Variáveis de ambiente injetadas no processo filho |
| `url` | string | Se SSE | URL do endpoint SSE |
| `headers` | object | ❌ | Cabeçalhos HTTP extras (ex: Authorization) |

### Gerenciar MCP Servers existentes

| Operação | Endpoint |
|----------|----------|
| Listar servidores do agente | `GET /agents/:agentId/mcp-servers` |
| Buscar servidor por ID | `GET /mcp-servers/:id` |
| Editar servidor | `PATCH /mcp-servers/:id` |
| Habilitar / Desabilitar | `PATCH /mcp-servers/:id/toggle` |
| Remover servidor | `DELETE /mcp-servers/:id` |

---

## 14. ETAPA 9 — Ativar o Agente

Após todas as configurações estarem completas, ative o agente:

### Endpoint

```
PATCH /agents/:id/toggle
```

Sem body. Inverte o campo `active`. Se estava `false` passa para `true` e vice-versa.

### Response 200

```json
{
  "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Aria Atendimento",
  "active": true,
  "updatedAt": "2026-04-19T10:10:00.000Z"
}
```

> **Atenção:** Somente agentes com `active: true` processam mensagens recebidas via webhook. MCP Servers com `enabled: false` são ignorados durante a execução.

---

## 15. Referência Completa de Endpoints

### Companies

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/companies` | Criar empresa |
| `GET` | `/companies` | Listar todas as empresas |
| `GET` | `/companies/:id` | Buscar empresa por ID |
| `PATCH` | `/companies/:id` | Atualizar dados da empresa |
| `DELETE` | `/companies/:id` | Remover empresa (cascade: remove todos os agentes) |

### Agents

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/companies/:companyId/agents` | Criar agente em uma empresa |
| `GET` | `/companies/:companyId/agents` | Listar agentes de uma empresa |
| `GET` | `/agents/:id` | Buscar agente com todas as configurações |
| `PATCH` | `/agents/:id` | Atualizar dados base (nome, descrição) |
| `PATCH` | `/agents/:id/toggle` | Ativar / desativar agente |
| `PATCH` | `/agents/:id/persona` | Atualizar persona e prompts |
| `PATCH` | `/agents/:id/model-config` | Atualizar parâmetros do LLM |
| `PATCH` | `/agents/:id/memory-config` | Atualizar configuração de memória |
| `PATCH` | `/agents/:id/media-config` | Atualizar configuração de mídia |
| `PATCH` | `/agents/:id/filter-config` | Atualizar filtros de mensagens |
| `DELETE` | `/agents/:id` | Remover agente e todas as suas configs |

### MCP Servers

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/agents/:agentId/mcp-servers` | Adicionar servidor MCP ao agente |
| `GET` | `/agents/:agentId/mcp-servers` | Listar servidores do agente |
| `GET` | `/mcp-servers/:id` | Buscar servidor por ID |
| `PATCH` | `/mcp-servers/:id` | Atualizar servidor |
| `PATCH` | `/mcp-servers/:id/toggle` | Habilitar / desabilitar servidor |
| `DELETE` | `/mcp-servers/:id` | Remover servidor |

### Auxiliares

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/llm/models` | Listar modelos LLM disponíveis (OpenRouter) |

---

## 16. Modelo de Dados Completo (TypeScript)

```typescript
// ─── Company ──────────────────────────────────────────────────────────────────

interface CompanyData {
  id: string;
  name: string;
  slug: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

// ─── Agent ────────────────────────────────────────────────────────────────────

interface AgentData {
  id: string;
  companyId: string;
  name: string;
  description?: string | null;
  active: boolean;
  instanceName?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface AgentWithConfigsData extends AgentData {
  persona?: AgentPersonaData | null;
  modelConfig?: AgentModelConfigData | null;
  memoryConfig?: AgentMemoryConfigData | null;
  mediaConfig?: AgentMediaConfigData | null;
  filterConfig?: AgentFilterConfigData | null;
}

// ─── Persona ──────────────────────────────────────────────────────────────────

interface AgentPersonaData {
  personaName: string;
  personaDescription?: string | null;
  systemPrompt: string;
  behaviorGuidelines?: string | null;
  guardrails?: string | null;
  contextPrompt?: string | null;
  welcomeMessage?: string | null;
  messageSignature?: string | null;
  voiceTone: 'FORMAL' | 'INFORMAL' | 'FRIENDLY' | 'PROFESSIONAL' | 'EMPATHETIC' | 'ASSERTIVE';
  communicationStyle: 'CONCISE' | 'DETAILED' | 'TECHNICAL' | 'SIMPLIFIED' | 'BALANCED';
  language: 'PT_BR' | 'EN_US' | 'ES_ES';
}

// ─── Model Config ─────────────────────────────────────────────────────────────

interface AgentModelConfigData {
  modelName: string;
  temperature?: number | null;
  maxTokens?: number | null;
  topP?: number | null;
  frequencyPenalty?: number | null;
  presencePenalty?: number | null;
  streaming: boolean;
}

// ─── Memory Config ────────────────────────────────────────────────────────────

interface AgentMemoryConfigData {
  memoryType: 'BUFFER' | 'SUMMARY' | 'VECTOR' | 'NONE';
  windowSize?: number | null;
  maxSummaryTokens?: number | null;
  useLongTermMemory: boolean;
}

// ─── Media Config ─────────────────────────────────────────────────────────────

interface AgentMediaConfigData {
  audioEnabled: boolean;
  audioDefaultMessage?: string | null;
  imageEnabled: boolean;
  imageExtractionPrompt?: string | null;
  imageDefaultMessage?: string | null;
  videoEnabled: boolean;
  videoExtractionPrompt?: string | null;
  videoDefaultMessage?: string | null;
}

// ─── Filter Config ────────────────────────────────────────────────────────────

interface AgentFilterConfigData {
  allowedPhones: string[];
  allowedGroups: string[];
  triggerEnabled: boolean;
  triggerWords: string[];
  triggerCaseSensitive: boolean;
  triggerRemoveFromText: boolean;
}

// ─── MCP Server ───────────────────────────────────────────────────────────────

type McpTransport = 'STDIO' | 'SSE';

interface McpServerData {
  id: string;
  agentId: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;
  command?: string | null;
  args: string[];
  env: Record<string, string>;
  url?: string | null;
  headers: Record<string, string>;
  createdAt: string;
  updatedAt: string;
}
```

---

## 17. Tratamento de Erros

### Mapeamento de status HTTP

| Status | Significado | Ação recomendada |
|--------|-------------|-----------------|
| `400 Bad Request` | Payload inválido ou campos obrigatórios ausentes | Repassar `message[]` ao usuário final |
| `404 Not Found` | Recurso não encontrado | Retornar 404 com mensagem descritiva |
| `409 Conflict` | `slug` ou `instanceName` já em uso | Indicar o campo duplicado ao usuário |
| `422 Unprocessable Entity` | Entidade não processável | Log + erro genérico ao usuário |
| `500 Internal Server Error` | Erro interno do Over Agent | Log + alerta de monitoramento |

### Formato do erro (400)

```json
{
  "statusCode": 400,
  "message": [
    "name should not be empty",
    "slug must match /^[a-z0-9-]+$/ regular expression"
  ],
  "error": "Bad Request"
}
```

---

## 18. Configuração do Client HTTP (Sistema Externo)

```typescript
// over-agent.client.ts

const overAgentClient = axios.create({
  baseURL: process.env.OVER_AGENT_BASE_URL, // ex: http://over-agent:3000
  timeout: 30_000, // 30 segundos
  headers: {
    'Content-Type': 'application/json',
    // Apenas se usando Opção B de autenticação:
    // 'X-Internal-API-Key': process.env.OVER_AGENT_API_KEY,
  },
});

// Retry automático para erros 5xx
axiosRetry(overAgentClient, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: (error) => error.response?.status >= 500,
});
```

### Variáveis de ambiente necessárias

```env
# URL base do Over Agent
OVER_AGENT_BASE_URL=http://over-agent:3000

# (Opcional) API Key para autenticação via header
OVER_AGENT_API_KEY=sua-chave-secreta-aqui

# Timeout em milissegundos
OVER_AGENT_HTTP_TIMEOUT_MS=30000
```

---

## 19. Exemplos Práticos

### Exemplo 1 — Agente de atendimento ao cliente (WhatsApp)

```bash
# 1. Criar company
curl -X POST http://over-agent:3000/companies \
  -H "Content-Type: application/json" \
  -d '{"name":"Acme Corp","slug":"acme-corp","email":"ti@acme.com"}'

# 2. Criar agente
curl -X POST http://over-agent:3000/companies/{companyId}/agents \
  -H "Content-Type: application/json" \
  -d '{"name":"Aria","instanceName":"acme-whatsapp-01"}'

# 3. Configurar persona
curl -X PATCH http://over-agent:3000/agents/{agentId}/persona \
  -H "Content-Type: application/json" \
  -d '{
    "personaName": "Aria",
    "systemPrompt": "Você é Aria, assistente da Acme Corp. Seja cordial e objetivo.",
    "welcomeMessage": "Olá! Sou a Aria. Como posso ajudar?",
    "voiceTone": "FRIENDLY",
    "language": "PT_BR"
  }'

# 4. Configurar modelo
curl -X PATCH http://over-agent:3000/agents/{agentId}/model-config \
  -H "Content-Type: application/json" \
  -d '{"modelName":"openai/gpt-4o","temperature":0.7,"maxTokens":1024}'

# 5. Ativar
curl -X PATCH http://over-agent:3000/agents/{agentId}/toggle
```

### Exemplo 2 — Agente com acesso a CRM via MCP

```bash
# Após criar e configurar o agente base...

# Adicionar servidor MCP SSE apontando para o CRM
curl -X POST http://over-agent:3000/agents/{agentId}/mcp-servers \
  -H "Content-Type: application/json" \
  -d '{
    "name": "CRM Salesforce",
    "transport": "SSE",
    "enabled": true,
    "url": "https://mcp.meucrm.com/sse",
    "headers": {
      "Authorization": "Bearer eyJhbGci..."
    }
  }'
```

### Exemplo 3 — Agente com filtro de gatilho

Útil para grupos onde o agente só deve responder quando mencionado:

```bash
curl -X PATCH http://over-agent:3000/agents/{agentId}/filter-config \
  -H "Content-Type: application/json" \
  -d '{
    "triggerEnabled": true,
    "triggerWords": ["@aria", "/aria"],
    "triggerCaseSensitive": false,
    "triggerRemoveFromText": true
  }'
```

---

## 20. Fluxo de Edição de Agente Existente

Para editar um agente já existente, sempre carregue o estado atual antes de exibir o formulário:

```
Sistema Externo                          Over Agent API
      │                                        │
      │── GET /agents/:id ─────────────────────>│
      │<── 200 { ...agente completo } ──────────│
      │                                        │
      │  (usuário edita campos na UI)          │
      │                                        │
      │── PATCH /agents/:id/persona ───────────>│  (apenas seção alterada)
      │<── 200 OK ──────────────────────────────│
```

> **Boas práticas:** Salve cada seção de configuração de forma independente — não aguarde o usuário salvar tudo de uma vez. Isso reduz a chance de perda de dados e torna a UX mais responsiva.

---

## 21. Regras de Negócio

1. **Uma company pode ter zero ou mais agentes.**
2. **`slug` da company é único e imutável** — escolha com cuidado (ex: `nome-da-empresa`).
3. **`instanceName` do agente é único em todo o sistema** — identifica a instância WhatsApp roteada a este agente.
4. **Agentes são criados com `active: false`** — ative explicitamente via `PATCH /agents/:id/toggle` após concluir a configuração.
5. **Somente agentes com `active: true`** processam mensagens recebidas via webhook.
6. **Somente MCP Servers com `enabled: true`** são conectados durante as execuções.
7. **Falhas de conexão com MCP Servers não bloqueiam o agente** — o backend ignora servidores com falha e continua com os demais.
8. **Deletar uma company remove em cascata** todos os seus agentes, conversas, knowledge bases e configurações vinculadas.

---

## 22. Critérios de Aceite

| ID | Critério |
|----|---------|
| CA-01 | Sistema externo consegue criar uma company e receber seu `id` e `slug` |
| CA-02 | Sistema externo consegue criar um agente vinculado à company |
| CA-03 | Sistema externo consegue configurar persona, modelo, memória, mídia e filtros independentemente |
| CA-04 | Sistema externo consegue adicionar MCP Servers STDIO e SSE ao agente |
| CA-05 | Sistema externo consegue ativar e desativar agentes e MCP Servers |
| CA-06 | Sistema externo consegue buscar o estado completo do agente com `GET /agents/:id` |
| CA-07 | Sistema externo consegue listar todos os agentes de uma company |
| CA-08 | Erros de validação do Over Agent são propagados corretamente ao cliente final |
| CA-09 | A integração funciona sem expor o Over Agent diretamente à internet |
| CA-10 | Lista de modelos LLM disponíveis é carregada dinamicamente via `GET /llm/models` |

---

## 23. Referências

- **Swagger interativo:** `{OVER_AGENT_BASE_URL}/docs`
- **Schema Prisma:** `prisma/schema.prisma`
- **Controller de Companies:** `src/infrastructure/http/company/company.controller.ts`
- **Controller de Agents:** `src/infrastructure/http/agent/agent.controller.ts`
- **Controller de MCP:** `src/infrastructure/http/mcp/mcp-server.controller.ts`
- **PRD MCP Servers (frontend):** `docs/prd-mcp-servers.md`
- **PRD CRUD externo de agentes:** `docs/prd-agent-crud-external-integration.md`
