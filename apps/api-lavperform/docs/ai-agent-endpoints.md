# Documentação de Endpoints   Agentes de IA

**Módulo:** `AiAgentModule`  
**Base URL:** `{API_BASE_URL}`  
**Integração:** Todos os dados de agentes são gerenciados via **over-agent-api** (`OVER_AGENT_BASE_URL`). Esta API atua como BFF (Backend for Frontend), resolvendo o `companyId` interno para o `overAgentCompanyId` antes de repassar as chamadas.

---

## Índice

1. [Agentes   CRUD](#1-agentes--crud)
2. [Persona](#2-persona)
3. [Configuração do Modelo LLM](#3-configuração-do-modelo-llm)
4. [Configuração de Memória](#4-configuração-de-memória)
5. [Configuração de Mídia](#5-configuração-de-mídia)
6. [Filtros de Mensagens](#6-filtros-de-mensagens)
7. [MCP Servers](#7-mcp-servers)
8. [Modelos LLM Disponíveis](#8-modelos-llm-disponíveis)
9. [Tabela de Referência Rápida](#9-tabela-de-referência-rápida)

---

## 1. Agentes   CRUD

### 1.1 Criar Agente

```
POST /companies/:companyId/ai-agents
```

Cria um novo agente de IA vinculado à empresa. O `companyId` é o ID interno da empresa nesta API   o sistema resolve automaticamente o `overAgentCompanyId` correspondente.

**Parâmetros de rota**

| Parâmetro | Tipo | Descrição |
|-----------|------|-----------|
| `companyId` | string (UUID) | ID interno da empresa |

**Body**

```json
{
  "name": "Aria Atendimento",
  "description": "Agente de atendimento ao cliente para o canal WhatsApp",
  "instanceName": "empresa-whatsapp-01",
  "persona": {
    "personaName": "Aria",
    "systemPrompt": "Você é Aria, assistente virtual. Responda de forma cordial e objetiva.",
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

**Campos**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome interno do agente |
| `description` | string | ❌ | Descrição do propósito |
| `instanceName` | string | ❌ | Nome único da instância WhatsApp (UAZAPI). Deve ser único no sistema. |
| `persona` | objeto | ❌ | Configuração inicial de persona (pode ser feita depois via PATCH) |
| `persona.personaName` | string | ❌ | Nome pelo qual o agente se apresenta |
| `persona.systemPrompt` | string | ❌ | Prompt principal injetado no LLM |
| `persona.welcomeMessage` | string | ❌ | Mensagem de boas-vindas |
| `persona.voiceTone` | enum | ❌ | `FORMAL` \| `INFORMAL` \| `FRIENDLY` \| `PROFESSIONAL` \| `EMPATHETIC` \| `ASSERTIVE` |
| `persona.communicationStyle` | enum | ❌ | `CONCISE` \| `DETAILED` \| `TECHNICAL` \| `SIMPLIFIED` \| `BALANCED` |
| `persona.language` | enum | ❌ | `PT_BR` \| `EN_US` \| `ES_ES` |
| `modelConfig.modelName` | string | ❌ | Slug do modelo no OpenRouter (ex: `openai/gpt-4o`) |
| `modelConfig.temperature` | number | ❌ | Criatividade (0.0 – 2.0) |
| `modelConfig.maxTokens` | integer | ❌ | Máximo de tokens na resposta |
| `memoryConfig.memoryType` | enum | ❌ | `BUFFER` \| `SUMMARY` \| `VECTOR` \| `NONE` |
| `memoryConfig.windowSize` | integer | ❌ | Janela de mensagens no contexto (1–100, apenas BUFFER) |

**Response 201**

```json
{
  "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Aria Atendimento",
  "description": "Agente de atendimento ao cliente para o canal WhatsApp",
  "active": false,
  "instanceName": "empresa-whatsapp-01",
  "persona": {
    "personaName": "Aria",
    "systemPrompt": "Você é Aria, assistente virtual...",
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
  },
  "createdAt": "2026-04-19T10:01:00.000Z",
  "updatedAt": "2026-04-19T10:01:00.000Z"
}
```

> O agente é criado com `active: false`. Ative-o apenas após concluir todas as configurações.

---

### 1.2 Listar Agentes da Empresa

```
GET /companies/:companyId/ai-agents
```

**Response 200**

```json
[
  {
    "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
    "name": "Aria Atendimento",
    "active": true,
    "instanceName": "empresa-whatsapp-01",
    "createdAt": "2026-04-19T10:01:00.000Z"
  }
]
```

---

### 1.3 Buscar Agente (com todas as configurações)

```
GET /ai-agents/:agentId
```

> O `agentId` aqui é o ID retornado pelo over-agent na criação (não é o `companyId`).

**Response 200**

```json
{
  "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "companyId": "550e8400-e29b-41d4-a716-446655440000",
  "name": "Aria Atendimento",
  "active": true,
  "instanceName": "empresa-whatsapp-01",
  "persona": { "...": "..." },
  "modelConfig": { "...": "..." },
  "memoryConfig": { "...": "..." },
  "mediaConfig": { "...": "..." },
  "filterConfig": { "...": "..." },
  "createdAt": "2026-04-19T10:01:00.000Z",
  "updatedAt": "2026-04-19T10:05:00.000Z"
}
```

---

### 1.4 Atualizar Dados Base do Agente

```
PATCH /ai-agents/:agentId
```

Atualiza apenas nome, descrição ou instanceName. Para configurações de persona, modelo, memória, mídia e filtros, use os endpoints dedicados abaixo.

**Body**

```json
{
  "name": "Aria Suporte Premium",
  "description": "Agente especializado em suporte técnico nível 2",
  "instanceName": "empresa-whatsapp-premium"
}
```

**Response 200**   objeto do agente atualizado.

---

### 1.5 Ativar / Desativar Agente

```
PATCH /ai-agents/:agentId/toggle
```

Sem body. Inverte o estado `active` do agente.

**Response 200**

```json
{
  "id": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "Aria Atendimento",
  "active": true,
  "updatedAt": "2026-04-19T10:10:00.000Z"
}
```

> Somente agentes com `active: true` processam mensagens recebidas via webhook.

---

### 1.6 Remover Agente

```
DELETE /ai-agents/:agentId
```

Remove o agente e todas as suas configurações (persona, model-config, memory-config, etc.) em cascata.

**Response 204**   sem corpo.

---

## 2. Persona

```
PATCH /ai-agents/:agentId/persona
```

Define a identidade, o comportamento conversacional e os prompts do agente.

**Body completo**

```json
{
  "personaName": "Aria",
  "personaDescription": "Assistente virtual especializada em atendimento ao cliente",
  "systemPrompt": "Você é Aria, assistente virtual. Responda de forma cordial e objetiva. Sempre se apresente pelo nome.",
  "behaviorGuidelines": "Sempre se apresente pelo nome. Nunca prometa prazos sem consultar a equipe. Encerre a conversa apenas quando o cliente confirmar que foi atendido.",
  "guardrails": "Nunca forneça informações financeiras detalhadas. Não discuta concorrentes. Não forneça diagnósticos médicos.",
  "contextPrompt": "A empresa é uma rede de restaurantes fundada em 2015, especializada em culinária italiana. Atende delivery e presencial.",
  "welcomeMessage": "Olá! Sou a Aria. Como posso ajudar você hoje?",
  "messageSignature": "_Atenciosamente, Aria 🤖_",
  "voiceTone": "FRIENDLY",
  "communicationStyle": "BALANCED",
  "language": "PT_BR"
}
```

**Campos**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `personaName` | string | Nome pelo qual o agente se apresenta ao usuário |
| `personaDescription` | string | Descrição interna (não exposta ao usuário final) |
| `systemPrompt` | string | Prompt principal injetado no LLM   define o papel e comportamento base |
| `behaviorGuidelines` | string | Regras de conduta e comportamento esperado |
| `guardrails` | string | O que o agente **não** deve fazer ou responder |
| `contextPrompt` | string | Contexto do negócio/domínio injetado no prompt |
| `welcomeMessage` | string | Mensagem enviada ao iniciar uma nova conversa |
| `messageSignature` | string | Texto fixo adicionado ao final de todas as mensagens |
| `voiceTone` | enum | Tom de voz: `FORMAL` \| `INFORMAL` \| `FRIENDLY` \| `PROFESSIONAL` \| `EMPATHETIC` \| `ASSERTIVE` |
| `communicationStyle` | enum | Estilo: `CONCISE` \| `DETAILED` \| `TECHNICAL` \| `SIMPLIFIED` \| `BALANCED` |
| `language` | enum | Idioma principal: `PT_BR` \| `EN_US` \| `ES_ES` |

**Response 200**   objeto da persona atualizada.

---

## 3. Configuração do Modelo LLM

```
PATCH /ai-agents/:agentId/model-config
```

Define qual modelo de linguagem o agente usa e seus parâmetros de geração.

**Body completo**

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

**Campos**

| Campo | Tipo | Limites | Descrição |
|-------|------|---------|-----------|
| `modelName` | string |   | Slug do modelo no OpenRouter. Use `GET /llm/models` para listar os disponíveis. Exemplos: `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`, `google/gemini-2.0-flash-001` |
| `temperature` | number | 0.0 – 2.0 | Criatividade (0 = determinístico, 2 = muito criativo). Recomendado: 0.7 para atendimento |
| `maxTokens` | integer | 1 – 16384 | Limite de tokens na resposta gerada |
| `topP` | number | 0.0 – 1.0 | Nucleus sampling   controla diversidade das respostas |
| `frequencyPenalty` | number | -2.0 – 2.0 | Penaliza repetição de tokens frequentes |
| `presencePenalty` | number | -2.0 – 2.0 | Penaliza tokens que já apareceram na conversa |
| `streaming` | boolean |   | Habilita streaming de tokens |

**Exemplos de uso por caso**

```json
// Atendimento ao cliente   respostas naturais e consistentes
{ "modelName": "openai/gpt-4o", "temperature": 0.7, "maxTokens": 512 }

// FAQ / respostas factuais   alta consistência
{ "modelName": "openai/gpt-4o", "temperature": 0.1, "maxTokens": 256 }

// Agente criativo / copywriting
{ "modelName": "anthropic/claude-3-5-sonnet", "temperature": 1.2, "maxTokens": 2048 }
```

**Response 200**   objeto da configuração do modelo atualizada.

---

## 4. Configuração de Memória

```
PATCH /ai-agents/:agentId/memory-config
```

Define como o agente gerencia o histórico de conversa.

**Body completo**

```json
{
  "memoryType": "BUFFER",
  "windowSize": 10,
  "maxSummaryTokens": 2000,
  "useLongTermMemory": false
}
```

**Campos**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `memoryType` | enum | Tipo de memória (ver tabela abaixo) |
| `windowSize` | integer (1–100) | Mensagens mantidas no contexto   apenas `BUFFER` |
| `maxSummaryTokens` | integer | Tokens máximos no resumo comprimido   apenas `SUMMARY` |
| `useLongTermMemory` | boolean | Habilita memória de longo prazo via vector store |

**Tipos de memória**

| Valor | Comportamento | Caso de uso recomendado |
|-------|--------------|------------------------|
| `BUFFER` | Mantém as últimas N mensagens na janela | FAQ, atendimento simples |
| `SUMMARY` | Comprime o histórico em um resumo | Conversas longas, suporte técnico |
| `VECTOR` | Busca semântica em histórico persistido | Assistente pessoal com memória longa |
| `NONE` | Sem memória   cada mensagem é independente | Agentes stateless, processamento em lote |

**Exemplos por caso de uso**

```json
// FAQ simples
{ "memoryType": "BUFFER", "windowSize": 5 }

// Suporte técnico com conversas longas
{ "memoryType": "SUMMARY", "maxSummaryTokens": 2000 }

// Assistente pessoal com histórico
{ "memoryType": "VECTOR", "useLongTermMemory": true }

// Bot stateless
{ "memoryType": "NONE" }
```

**Response 200**   objeto da configuração de memória atualizada.

---

## 5. Configuração de Mídia

```
PATCH /ai-agents/:agentId/media-config
```

Define como o agente lida com mensagens de áudio, imagem e vídeo recebidas via WhatsApp.

**Body completo**

```json
{
  "audioEnabled": true,
  "audioDefaultMessage": "Desculpe, não consigo processar mensagens de áudio. Por favor, envie em texto.",
  "imageEnabled": true,
  "imageExtractionPrompt": "Descreva detalhadamente o conteúdo da imagem: objetos, texto visível, cores e contexto.",
  "imageDefaultMessage": "Desculpe, não consigo processar imagens no momento.",
  "videoEnabled": false,
  "videoExtractionPrompt": "Analise o frame do vídeo e descreva: cena, pessoas, objetos e texto visível.",
  "videoDefaultMessage": "Desculpe, não consigo processar vídeos."
}
```

**Campos**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `audioEnabled` | boolean | Habilita transcrição de áudio via Whisper (OpenAI). Se `false`, responde com `audioDefaultMessage` |
| `audioDefaultMessage` | string | Mensagem enviada quando áudio está desabilitado |
| `imageEnabled` | boolean | Habilita interpretação de imagens via GPT-4o Vision |
| `imageExtractionPrompt` | string | Prompt usado pelo LLM para extrair informações da imagem |
| `imageDefaultMessage` | string | Mensagem enviada quando imagens estão desabilitadas |
| `videoEnabled` | boolean | Habilita análise de vídeo via GPT-4o Vision (thumbnail do vídeo) |
| `videoExtractionPrompt` | string | Prompt para extração de informações do vídeo |
| `videoDefaultMessage` | string | Mensagem enviada quando vídeos estão desabilitados |

**Response 200**   objeto da configuração de mídia atualizada.

---

## 6. Filtros de Mensagens

```
PATCH /ai-agents/:agentId/filter-config
```

Define quais mensagens e remetentes o agente processa. Útil para limitar o agente a grupos específicos ou exigir uma palavra de ativação.

**Body completo**

```json
{
  "allowedPhones": ["5541999990001", "5511988887777"],
  "allowedGroups": ["120363012345678901@g.us"],
  "triggerEnabled": true,
  "triggerWords": ["@aria", "/aria", "ajuda"],
  "triggerCaseSensitive": false,
  "triggerRemoveFromText": true
}
```

**Campos**

| Campo | Tipo | Descrição |
|-------|------|-----------|
| `allowedPhones` | string[] | Telefones permitidos (formato sem `+`, ex: `5541999990001`). Array vazio = aceita qualquer número |
| `allowedGroups` | string[] | `chatId` dos grupos WhatsApp permitidos. Array vazio = aceita qualquer grupo |
| `triggerEnabled` | boolean | Se `true`, o agente só responde ao encontrar uma `triggerWord` na mensagem |
| `triggerWords` | string[] | Palavras ou frases que ativam o agente (basta uma coincidir) |
| `triggerCaseSensitive` | boolean | Se `true`, a busca por trigger é case-sensitive |
| `triggerRemoveFromText` | boolean | Se `true`, remove a trigger do texto antes de enviar ao LLM |

**Exemplos por caso de uso**

```json
// Agente aberto   atende qualquer pessoa, qualquer mensagem
{
  "allowedPhones": [],
  "allowedGroups": [],
  "triggerEnabled": false
}

// Grupo com ativação por menção
{
  "triggerEnabled": true,
  "triggerWords": ["@aria", "/aria"],
  "triggerCaseSensitive": false,
  "triggerRemoveFromText": true
}

// Apenas para números VIP
{
  "allowedPhones": ["5541999990001", "5541999990002"],
  "triggerEnabled": false
}
```

**Response 200**   objeto da configuração de filtros atualizada.

---

## 7. MCP Servers

MCP Servers estendem o agente com ferramentas externas (CRM, banco de dados, APIs, sistema de arquivos, etc.) via Model Context Protocol.

---

### 7.1 Adicionar MCP Server

```
POST /ai-agents/:agentId/mcp-servers
```

**Body   Tipo STDIO** (processo local executado como subprocesso)

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

**Body   Tipo SSE** (servidor remoto via HTTP)

```json
{
  "name": "CRM Salesforce",
  "transport": "SSE",
  "enabled": true,
  "url": "https://mcp.meucrm.com/sse",
  "headers": {
    "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
  }
}
```

**Campos**

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|-------------|-----------|
| `name` | string | ✅ | Nome de exibição do servidor |
| `transport` | enum | ✅ | `STDIO` ou `SSE` |
| `enabled` | boolean | ❌ | Padrão `true`. Se `false`, o servidor não é conectado nas execuções |
| `command` | string | Se STDIO | Executável a lançar (ex: `npx`, `python`, `node`) |
| `args` | string[] | ❌ | Argumentos do comando STDIO |
| `env` | object | ❌ | Variáveis de ambiente injetadas no processo filho |
| `url` | string | Se SSE | URL do endpoint SSE |
| `headers` | object | ❌ | Cabeçalhos HTTP extras (ex: `Authorization`) |

**Response 201**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "agentId": "7f3a1b2c-4d5e-6f7a-8b9c-0d1e2f3a4b5c",
  "name": "CRM Salesforce",
  "transport": "SSE",
  "enabled": true,
  "url": "https://mcp.meucrm.com/sse",
  "headers": { "Authorization": "Bearer ..." },
  "createdAt": "2026-04-19T11:00:00.000Z"
}
```

---

### 7.2 Listar MCP Servers do Agente

```
GET /ai-agents/:agentId/mcp-servers
```

**Response 200**   array de MCP Servers do agente.

---

### 7.3 Buscar MCP Server por ID

```
GET /mcp-servers/:mcpServerId
```

**Response 200**   objeto completo do MCP Server.

---

### 7.4 Atualizar MCP Server

```
PATCH /mcp-servers/:mcpServerId
```

Todos os campos são opcionais (partial update).

**Body**

```json
{
  "name": "CRM Integration v2",
  "url": "https://mcp-v2.meucrm.com/sse",
  "headers": {
    "Authorization": "Bearer novo-token-aqui"
  }
}
```

**Response 200**   objeto do MCP Server atualizado.

---

### 7.5 Habilitar / Desabilitar MCP Server

```
PATCH /mcp-servers/:mcpServerId/toggle
```

Sem body. Inverte o campo `enabled`.

**Response 200**

```json
{
  "id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  "name": "CRM Salesforce",
  "enabled": false,
  "updatedAt": "2026-04-19T12:00:00.000Z"
}
```

> MCP Servers com `enabled: false` são ignorados nas execuções. Falhas de conexão também não bloqueiam o agente.

---

### 7.6 Remover MCP Server

```
DELETE /mcp-servers/:mcpServerId
```

**Response 204**   sem corpo.

---

## 8. Modelos LLM Disponíveis

```
GET /llm/models
```

Retorna a lista de modelos disponíveis no OpenRouter, consultada em tempo real via over-agent-api. Use para popular dinamicamente um `<select>` no frontend.

**Response 200**

```json
[
  {
    "id": "openai/gpt-4o",
    "name": "GPT-4o",
    "contextLength": 128000,
    "pricing": { "prompt": "0.000005", "completion": "0.000015" }
  },
  {
    "id": "anthropic/claude-3-5-sonnet",
    "name": "Claude 3.5 Sonnet",
    "contextLength": 200000,
    "pricing": { "prompt": "0.000003", "completion": "0.000015" }
  },
  {
    "id": "google/gemini-2.0-flash-001",
    "name": "Gemini 2.0 Flash",
    "contextLength": 1048576,
    "pricing": { "prompt": "0.0000001", "completion": "0.0000004" }
  }
]
```

---

## 9. Tabela de Referência Rápida

### Agentes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/companies/:companyId/ai-agents` | Criar agente |
| `GET` | `/companies/:companyId/ai-agents` | Listar agentes da empresa |
| `GET` | `/ai-agents/:agentId` | Buscar agente completo |
| `PATCH` | `/ai-agents/:agentId` | Atualizar nome / descrição / instanceName |
| `PATCH` | `/ai-agents/:agentId/toggle` | Ativar / desativar |
| `DELETE` | `/ai-agents/:agentId` | Remover agente (cascade) |

### Configurações do Agente

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `PATCH` | `/ai-agents/:agentId/persona` | Persona, prompts e tom de voz |
| `PATCH` | `/ai-agents/:agentId/model-config` | Modelo LLM e parâmetros |
| `PATCH` | `/ai-agents/:agentId/memory-config` | Tipo e tamanho de memória |
| `PATCH` | `/ai-agents/:agentId/media-config` | Áudio, imagem e vídeo |
| `PATCH` | `/ai-agents/:agentId/filter-config` | Filtros de remetente e gatilho |

### MCP Servers

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/ai-agents/:agentId/mcp-servers` | Adicionar servidor MCP |
| `GET` | `/ai-agents/:agentId/mcp-servers` | Listar servidores do agente |
| `GET` | `/mcp-servers/:mcpServerId` | Buscar servidor por ID |
| `PATCH` | `/mcp-servers/:mcpServerId` | Atualizar servidor |
| `PATCH` | `/mcp-servers/:mcpServerId/toggle` | Habilitar / desabilitar |
| `DELETE` | `/mcp-servers/:mcpServerId` | Remover servidor |

### Auxiliares

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/llm/models` | Listar modelos LLM disponíveis |

---

## Observações Gerais

- **`agentId`**   é o ID retornado pelo over-agent-api no momento da criação. Não é o ID interno da empresa.
- **`companyId`**   é o ID interno da empresa nesta API (foodcrm-api). O sistema resolve o `overAgentCompanyId` correspondente automaticamente.
- **Agentes inativos**   agentes com `active: false` não processam nenhuma mensagem.
- **MCP Servers desabilitados**   falhas de conexão em MCP Servers não bloqueiam o agente; servidores com problema são ignorados e os demais continuam funcionando.
- **Configurações independentes**   cada seção (persona, model-config, etc.) pode ser salva separadamente, sem necessidade de enviar tudo de uma vez.
