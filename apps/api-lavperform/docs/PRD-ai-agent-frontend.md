# PRD   Agente de IA: Implementação Frontend

**Versão:** 1.0  
**Data:** 19/04/2026  
**Status:** Em revisão  
**Público-alvo:** Time de Frontend  

---

## 1. Contexto e Objetivo

O backend passou por uma reestruturação completa do módulo de Agentes de IA. A arquitetura anterior armazenava os dados do agente localmente no banco de dados do FoodCRM. A nova arquitetura delega toda a lógica e persistência para um serviço externo chamado **over-agent-api**, que é responsável por gerenciar:

- Agentes de IA e suas configurações
- Persona, modelos LLM, memória, mídia e filtros
- Servidores MCP (Model Context Protocol)

O FoodCRM agora atua como **proxy/facade** para esse serviço. O campo `overAgentCompanyId` foi adicionado à entidade `Company` para fazer o vínculo entre a empresa do FoodCRM e sua representação no over-agent.

**Objetivo desta feature:** Implementar no frontend todas as telas e fluxos de gerenciamento de Agentes de IA usando as novas APIs.

---

## 2. Mudanças no Backend (Resumo Técnico)

### 2.1 Provisionamento Automático de Empresa

Ao criar uma empresa no FoodCRM, o backend automaticamente provisiona a empresa no over-agent-api. Esse processo é transparente e não requer ação do usuário.

### 2.2 Arquitetura de IDs

- `companyId`: ID interno da empresa no FoodCRM (UUID)
- `agentId`: ID do agente no over-agent-api (retornado pelo serviço externo)
- `mcpServerId`: ID do MCP Server no over-agent-api

> **Atenção:** Os endpoints de agente utilizam o `agentId` retornado pelo over-agent, **não** o `companyId`.

### 2.3 Endpoints Disponíveis

#### Agentes

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/companies/:companyId/ai-agents` | Criar agente |
| `GET` | `/companies/:companyId/ai-agents` | Listar agentes da empresa |
| `GET` | `/ai-agents/:agentId` | Buscar agente com todas as configurações |
| `PATCH` | `/ai-agents/:agentId` | Atualizar nome, descrição e instância |
| `PATCH` | `/ai-agents/:agentId/toggle` | Ativar / desativar agente |
| `DELETE` | `/ai-agents/:agentId` | Remover agente |

#### Configurações do Agente

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `PATCH` | `/ai-agents/:agentId/persona` | Atualizar persona e prompts |
| `PATCH` | `/ai-agents/:agentId/model-config` | Configurar modelo LLM |
| `PATCH` | `/ai-agents/:agentId/memory-config` | Configurar memória |
| `PATCH` | `/ai-agents/:agentId/media-config` | Configurar tratamento de mídia |
| `PATCH` | `/ai-agents/:agentId/filter-config` | Configurar filtros de mensagem |

#### MCP Servers

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `POST` | `/ai-agents/:agentId/mcp-servers` | Adicionar MCP Server |
| `GET` | `/ai-agents/:agentId/mcp-servers` | Listar MCP Servers do agente |
| `GET` | `/mcp-servers/:mcpServerId` | Buscar MCP Server por ID |
| `PATCH` | `/mcp-servers/:mcpServerId` | Atualizar MCP Server |
| `PATCH` | `/mcp-servers/:mcpServerId/toggle` | Habilitar / desabilitar MCP Server |
| `DELETE` | `/mcp-servers/:mcpServerId` | Remover MCP Server |

#### Modelos LLM

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| `GET` | `/llm/models` | Listar modelos disponíveis (OpenRouter via over-agent) |

---

## 3. Schemas de Dados

### 3.1 Criar Agente   `POST /companies/:companyId/ai-agents`

```json
{
  "name": "Assistente FoodCRM",
  "description": "Agente de atendimento ao cliente",
  "instanceName": "minha-instancia-wpp",
  "persona": {
    "personaName": "Assistente",
    "systemPrompt": "Você é um assistente...",
    "welcomeMessage": "Olá! Como posso ajudar?",
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
    "windowSize": 20
  }
}
```

**Campos obrigatórios:** `name`

**Enums disponíveis:**

| Enum | Valores |
|------|---------|
| `voiceTone` | `FORMAL`, `INFORMAL`, `FRIENDLY`, `PROFESSIONAL`, `EMPATHETIC`, `ASSERTIVE` |
| `communicationStyle` | `CONCISE`, `DETAILED`, `TECHNICAL`, `SIMPLIFIED`, `BALANCED` |
| `language` | `PT_BR`, `EN_US`, `ES_ES` |
| `memoryType` | `BUFFER`, `SUMMARY`, `VECTOR`, `NONE` |

---

### 3.2 Atualizar Dados Base   `PATCH /ai-agents/:agentId`

```json
{
  "name": "Novo nome",
  "description": "Nova descrição",
  "instanceName": "instancia-wpp"
}
```

Todos os campos são opcionais.

---

### 3.3 Atualizar Persona   `PATCH /ai-agents/:agentId/persona`

```json
{
  "personaName": "Assistente Virtual",
  "personaDescription": "Assistente de atendimento do restaurante",
  "systemPrompt": "Você é um assistente especializado em...",
  "behaviorGuidelines": "Sempre seja educado e responda em português",
  "guardrails": "Nunca forneça informações pessoais",
  "contextPrompt": "O restaurante funciona de seg a sex das 11h às 22h",
  "welcomeMessage": "Olá! Bem-vindo ao restaurante. Como posso ajudar?",
  "messageSignature": "Equipe de Atendimento",
  "voiceTone": "FRIENDLY",
  "communicationStyle": "BALANCED",
  "language": "PT_BR"
}
```

Todos os campos são opcionais.

---

### 3.4 Configuração do Modelo LLM   `PATCH /ai-agents/:agentId/model-config`

```json
{
  "modelName": "openai/gpt-4o",
  "temperature": 0.7,
  "maxTokens": 2048,
  "topP": 0.9,
  "frequencyPenalty": 0.0,
  "presencePenalty": 0.0,
  "streaming": true
}
```

**Restrições:**

| Campo | Mín | Máx |
|-------|-----|-----|
| `temperature` | 0 | 2 |
| `maxTokens` | 1 | 16384 |
| `topP` | 0 | 1 |
| `frequencyPenalty` | -2 | 2 |
| `presencePenalty` | -2 | 2 |

> O campo `modelName` deve ser selecionado a partir da lista retornada por `GET /llm/models`.

---

### 3.5 Configuração de Memória   `PATCH /ai-agents/:agentId/memory-config`

```json
{
  "memoryType": "BUFFER",
  "windowSize": 30,
  "maxSummaryTokens": 512,
  "useLongTermMemory": false
}
```

| Campo | Descrição | Restrição |
|-------|-----------|-----------|
| `memoryType` | Tipo de memória | `BUFFER`, `SUMMARY`, `VECTOR`, `NONE` |
| `windowSize` | Nº de mensagens na janela (só `BUFFER`) | 1 a 100 |
| `maxSummaryTokens` | Tokens máximos no resumo (só `SUMMARY`) |   |
| `useLongTermMemory` | Habilita vector store de longo prazo |   |

> A UI deve exibir campos condicionalmente conforme o `memoryType` selecionado.

---

### 3.6 Configuração de Mídia   `PATCH /ai-agents/:agentId/media-config`

```json
{
  "audioEnabled": true,
  "audioDefaultMessage": "Desculpe, não consigo processar áudios no momento.",
  "imageEnabled": true,
  "imageExtractionPrompt": "Descreva o que há na imagem",
  "imageDefaultMessage": "Não consigo processar esta imagem.",
  "videoEnabled": false,
  "videoExtractionPrompt": "Descreva o vídeo",
  "videoDefaultMessage": "Não consigo processar vídeos."
}
```

---

### 3.7 Configuração de Filtros   `PATCH /ai-agents/:agentId/filter-config`

```json
{
  "allowedPhones": ["5511999999999", "5521888888888"],
  "allowedGroups": ["120363000000000000@g.us"],
  "triggerEnabled": true,
  "triggerWords": ["oi", "olá", "menu", "cardápio"],
  "triggerCaseSensitive": false,
  "triggerRemoveFromText": true
}
```

| Campo | Descrição |
|-------|-----------|
| `allowedPhones` | Lista de telefones permitidos (sem +). Lista vazia = aceita todos. |
| `allowedGroups` | chatIds de grupos WhatsApp permitidos. Lista vazia = aceita todos. |
| `triggerEnabled` | Agente só responde se detectar uma trigger word |
| `triggerWords` | Palavras que ativam o agente |
| `triggerCaseSensitive` | Se `true`, diferencia maiúsculas/minúsculas |
| `triggerRemoveFromText` | Remove a trigger word da mensagem antes de enviar ao agente |

---

### 3.8 Criar MCP Server   `POST /ai-agents/:agentId/mcp-servers`

```json
{
  "name": "Meu MCP Server",
  "transport": "SSE",
  "enabled": true,
  "url": "https://mcp.exemplo.com/sse",
  "headers": {
    "Authorization": "Bearer token123"
  }
}
```

**Para transporte STDIO:**

```json
{
  "name": "MCP via STDIO",
  "transport": "STDIO",
  "enabled": true,
  "command": "npx",
  "args": ["-y", "@modelcontextprotocol/server-filesystem", "/tmp"],
  "env": {
    "NODE_ENV": "production"
  }
}
```

**Enums:**

| Enum | Valores |
|------|---------|
| `transport` | `STDIO`, `SSE` |

> Campos `command`, `args` e `env` são específicos de `STDIO`.  
> Campos `url` e `headers` são específicos de `SSE`.  
> A UI deve mostrar os campos condicionalmente de acordo com o transporte selecionado.

---

## 4. Fluxos de Tela e Funcionalidades

### 4.1 Listagem de Agentes

**Rota sugerida:** `/companies/:companyId/ai-agents`

**Comportamento:**
- Carregar a lista via `GET /companies/:companyId/ai-agents`
- Exibir card ou linha por agente com: nome, descrição, status (ativo/inativo), instância WhatsApp vinculada
- Botão para **criar novo agente**
- Ações por agente:
  - **Visualizar/Editar** → abre tela de detalhe
  - **Ativar/Desativar** → `PATCH /ai-agents/:agentId/toggle` (toggle inline, com feedback visual imediato)
  - **Excluir** → modal de confirmação + `DELETE /ai-agents/:agentId`

---

### 4.2 Criar Agente

**Rota sugerida:** `/companies/:companyId/ai-agents/new`

**Formulário com campos:**
- `name` (obrigatório)
- `description` (opcional)
- `instanceName` (opcional)   nome da instância UAZAPI/WhatsApp

**Configurações opcionais na criação (accordion/step):**
- Persona (campos básicos: `personaName`, `systemPrompt`, `welcomeMessage`, `voiceTone`, `communicationStyle`, `language`)
- Modelo LLM (`modelName` via dropdown populado com `GET /llm/models`, `temperature`, `maxTokens`)
- Memória (`memoryType`, `windowSize`)

Após criação bem-sucedida: redirecionar para tela de detalhe do agente.

---

### 4.3 Detalhe / Edição do Agente

**Rota sugerida:** `/ai-agents/:agentId`

**Estrutura em abas ou seções colapsáveis:**

#### Aba 1   Informações Gerais
- Campos: `name`, `description`, `instanceName`
- Salvar via `PATCH /ai-agents/:agentId`
- Toggle de ativo/inativo visível no topo

#### Aba 2   Persona
- Campos: `personaName`, `personaDescription`, `systemPrompt`, `behaviorGuidelines`, `guardrails`, `contextPrompt`, `welcomeMessage`, `messageSignature`, `voiceTone`, `communicationStyle`, `language`
- Salvar via `PATCH /ai-agents/:agentId/persona`

#### Aba 3   Modelo LLM
- Campo `modelName`: dropdown com lista de `GET /llm/models`
- Sliders ou inputs numéricos para: `temperature`, `maxTokens`, `topP`, `frequencyPenalty`, `presencePenalty`
- Toggle para `streaming`
- Salvar via `PATCH /ai-agents/:agentId/model-config`

#### Aba 4   Memória
- Select para `memoryType`: `BUFFER`, `SUMMARY`, `VECTOR`, `NONE`
- Condicionalmente:
  - Se `BUFFER`: exibir `windowSize` (slider 1–100)
  - Se `SUMMARY`: exibir `maxSummaryTokens`
  - Qualquer tipo (exceto `NONE`): exibir toggle `useLongTermMemory`
- Salvar via `PATCH /ai-agents/:agentId/memory-config`

#### Aba 5   Mídia
- Seção **Áudio:** toggle `audioEnabled` + textarea `audioDefaultMessage`
- Seção **Imagem:** toggle `imageEnabled` + textarea `imageExtractionPrompt` + textarea `imageDefaultMessage`
- Seção **Vídeo:** toggle `videoEnabled` + textarea `videoExtractionPrompt` + textarea `videoDefaultMessage`
- Salvar via `PATCH /ai-agents/:agentId/media-config`

#### Aba 6   Filtros
- Input de lista `allowedPhones` (chips/tags)
- Input de lista `allowedGroups` (chips/tags)
- Toggle `triggerEnabled`
- Condicionalmente (se `triggerEnabled`):
  - Input de lista `triggerWords` (chips/tags)
  - Toggle `triggerCaseSensitive`
  - Toggle `triggerRemoveFromText`
- Salvar via `PATCH /ai-agents/:agentId/filter-config`

#### Aba 7   MCP Servers
- Lista de MCP Servers do agente (`GET /ai-agents/:agentId/mcp-servers`)
- Por item: nome, transporte, status, ações (editar, toggle, excluir)
- Botão **Adicionar MCP Server** → abre modal/drawer de criação
- Salvar via `POST /ai-agents/:agentId/mcp-servers`

---

### 4.4 Gerenciamento de MCP Servers

#### Modal/Drawer de Criação/Edição

**Campos comuns:**
- `name` (obrigatório)
- `transport` (obrigatório): select com `STDIO` ou `SSE`
- `enabled`: toggle

**Campos condicionais por transporte:**

*STDIO:*
- `command`   input de texto (ex: `npx`, `python`)
- `args`   input de lista/chips (ex: `-y`, `@mcp/server`)
- `env`   editor de key-value pairs

*SSE:*
- `url`   input de URL
- `headers`   editor de key-value pairs (ex: `Authorization: Bearer ...`)

**Ações:**
- Criar: `POST /ai-agents/:agentId/mcp-servers`
- Atualizar: `PATCH /mcp-servers/:mcpServerId`
- Toggle: `PATCH /mcp-servers/:mcpServerId/toggle`
- Excluir: `DELETE /mcp-servers/:mcpServerId` (com confirmação)

---

## 5. Estados e Feedbacks de UI

### 5.1 Estados de Loading
- Skeleton loader ao carregar dados do agente
- Spinner inline ao salvar configurações por seção
- Desabilitar botões durante requisições

### 5.2 Feedback de Sucesso/Erro
- Toast de sucesso ao salvar qualquer seção
- Toast de erro com a mensagem retornada pela API
- Mensagem específica quando a empresa não está provisionada no over-agent: `"Empresa ainda não provisionada no over-agent. Aguarde ou contate o suporte."`

### 5.3 Toggle Ativar/Desativar Agente
- Toggle visível no topo da página de detalhe e na listagem
- Atualização otimista do estado + rollback em caso de erro
- Label dinâmico: **Ativo** / **Inativo**

### 5.4 Estado Vazio
- Quando não há agentes, exibir ilustração + CTA para criar o primeiro agente

---

## 6. Requisitos Não Funcionais

| Requisito | Detalhe |
|-----------|---------|
| **Persistência de estado** | Formulários devem manter rascunho ao navegar entre abas |
| **Validação client-side** | Validar limites numéricos antes de enviar (ex: `temperature` 0–2) |
| **Responsividade** | Suporte a telas mobile e desktop |
| **Acessibilidade** | Labels, ARIA roles e navegação por teclado |
| **Tratamento de erros** | Erros 400, 404 e 500 com mensagens amigáveis |

---

## 7. Critérios de Aceite

- [ ] É possível listar todos os agentes de uma empresa
- [ ] É possível criar um agente com nome, descrição e instância WhatsApp
- [ ] É possível editar os dados base de um agente
- [ ] É possível ativar e desativar um agente via toggle
- [ ] É possível excluir um agente com confirmação
- [ ] É possível editar a Persona com todos os campos documentados
- [ ] A seleção de modelo LLM usa dropdown populado com dados reais da API
- [ ] Sliders/inputs de configuração LLM respeitam os limites min/max
- [ ] Configuração de Memória exibe campos condicionalmente por `memoryType`
- [ ] Configuração de Mídia permite habilitar/desabilitar e personalizar mensagens por tipo de mídia
- [ ] Filtros de telefone e grupo funcionam com input de chips/tags
- [ ] Filtros de trigger exibem campos condicionalmente quando `triggerEnabled = true`
- [ ] É possível criar MCP Servers STDIO e SSE com campos condicionais
- [ ] É possível ativar/desativar e excluir MCP Servers
- [ ] Todos os erros da API são exibidos ao usuário de forma amigável
- [ ] A tela exibe estado vazio quando não há agentes

---

## 8. Dúvidas em Aberto

| # | Dúvida | Responsável |
|---|--------|-------------|
| 1 | O campo `instanceName` deve ser um dropdown com instâncias UAZAPI existentes ou um campo de texto livre? | Backend/Product |
| 2 | A tela de agente deve ser acessada pelo menu principal ou dentro da tela da empresa? | Product |
| 3 | Os modelos LLM retornados por `GET /llm/models` possuem campos de preço para exibição? | Backend |
| 4 | Há limite de agentes por empresa no over-agent? | Backend |
| 5 | O `agentId` é um UUID ou outro formato? Confirmação do contrato de resposta da criação. | Backend |

---

## 9. Referências

- Serviço: `over-agent-api` (integração interna)
- Controller: `src/ai-agent/presentation/ai-agent.controller.ts`
- Service: `src/ai-agent/application/ai-agent.service.ts`
- Integration: `src/integrations/over-agent-api/over-agent-api.service.ts`
- DTOs: `src/ai-agent/application/dto/`
