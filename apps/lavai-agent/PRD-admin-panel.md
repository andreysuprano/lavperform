# PRD — Painel Administrativo Over Agent (Next.js)

**Projeto:** Over Agent Admin  
**Stack:** Next.js (App Router) + TypeScript  
**API Base:** `http://localhost:3000` (Over Agent API)  
**Data:** Abril/2026  
**Acesso:** Sem autenticação nesta fase

---

## 1. Visão Geral

Painel web para gerenciar empresas (tenants) e seus agentes de IA. Consome diretamente a Over Agent REST API. Todas as funcionalidades expostas pela API devem ter interface correspondente no painel.

---

## 2. Mapa de Rotas do Painel

```
/                          → Redirect para /companies
/companies                 → Lista de todas as empresas
/companies/new             → Formulário criar empresa
/companies/[id]            → Detalhe da empresa + lista de agentes
/companies/[id]/edit       → Formulário editar empresa
/companies/[id]/agents/new → Formulário criar agente
/agents/[id]               → Detalhe do agente + todas as configurações
/agents/[id]/persona       → Aba: Persona & Prompts
/agents/[id]/model         → Aba: Modelo LLM
/agents/[id]/memory        → Aba: Memória & Contexto
/agents/[id]/media         → Aba: Mídia (Áudio/Imagem/Vídeo)
/agents/[id]/filters       → Aba: Filtros & Gatilhos
```

---

## 3. Funcionalidades por Página

---

### 3.1 `/companies` — Lista de Empresas

**API:** `GET /companies`

**O que exibir por empresa:**
- Nome (`name`)
- Slug (`slug`) — exibir como badge/tag
- Email (`email`)
- Telefone (`phone`)
- Status ativo/inativo (`active`) — indicador visual (badge verde/vermelho)
- Data de criação (`createdAt`)
- Quantidade de agentes da empresa

**Ações disponíveis:**
- Botão "Nova Empresa" → `/companies/new`
- Clique na linha → `/companies/[id]`
- Botão editar inline → `/companies/[id]/edit`
- Botão excluir inline → modal de confirmação → `DELETE /companies/:id`

---

### 3.2 `/companies/new` e `/companies/[id]/edit` — Formulário Empresa

**APIs:**
- Criar: `POST /companies`
- Editar: `PATCH /companies/:id`

**Campos do formulário:**

| Campo | Tipo | Validação | Obrigatório |
|---|---|---|---|
| Nome | `text` | não vazio | sim |
| Slug | `text` | apenas `a-z`, `0-9`, `-` (regex) | sim |
| Email | `email` | formato email | não |
| Telefone | `text` | livre | não |

---

### 3.3 `/companies/[id]` — Detalhe da Empresa

**APIs:**
- `GET /companies/:id` — dados da empresa
- `GET /companies/:id/agents` — lista de agentes

**Seção superior: dados da empresa**
- Exibir todos os campos com botão "Editar"
- Botão "Excluir empresa" (com modal de confirmação — atenção: cascade deleta todos os agentes)

**Seção inferior: agentes da empresa**

O que exibir por agente:
- Nome (`name`)
- Descrição (`description`)
- Status ativo (`active`) — badge + toggle rápido via `PATCH /agents/:id/toggle`
- Data de criação
- Indicadores de configuração: ícones ou badges mostrando se persona / model / memory / media / filter estão configurados (verificar se os objetos existem e não são null)

**Ações:**
- "Novo Agente" → `/companies/[id]/agents/new`
- Clique no agente → `/agents/[id]`
- Toggle ativo/inativo diretamente na lista
- Excluir agente (modal de confirmação) → `DELETE /agents/:id`

---

### 3.4 `/companies/[id]/agents/new` — Criar Agente

**API:** `POST /companies/:companyId/agents`

O formulário de criação aceita campos básicos + configurações opcionais no mesmo payload:

**Seção: Dados básicos**

| Campo | Tipo | Obrigatório |
|---|---|---|
| Nome | `text` | sim |
| Descrição | `textarea` | não |

**Seção colapsável: Persona (opcional)**
- `personaName`, `personaDescription`, `systemPrompt`, `behaviorGuidelines`, `guardrails`, `contextPrompt`, `welcomeMessage`
- `voiceTone` → select: FORMAL | INFORMAL | FRIENDLY | PROFESSIONAL | EMPATHETIC | ASSERTIVE
- `communicationStyle` → select: CONCISE | DETAILED | TECHNICAL | SIMPLIFIED | BALANCED
- `language` → select: PT_BR | EN_US | ES_ES

**Seção colapsável: Modelo LLM (opcional)**
- `provider` → select: OPENAI | ANTHROPIC | GOOGLE | GROQ
- `modelName` → `text` (slug OpenRouter, ex: `openai/gpt-4o`)
- `temperature` → slider 0.0–2.0 (step 0.1)
- `maxTokens` → number input 1–16384
- `topP` → slider 0.0–1.0 (step 0.05)
- `frequencyPenalty` → slider −2.0–2.0 (step 0.1)
- `presencePenalty` → slider −2.0–2.0 (step 0.1)
- `streaming` → toggle boolean

**Seção colapsável: Memória (opcional)**
- `memoryType` → select: BUFFER | SUMMARY | VECTOR | NONE
- `windowSize` → number 1–100 (visível apenas quando BUFFER)
- `maxSummaryTokens` → number ≥ 100 (visível apenas quando SUMMARY)
- `useLongTermMemory` → toggle boolean

Após criação, redirecionar para `/agents/[id]`.

---

### 3.5 `/agents/[id]` — Detalhe do Agente

**API:** `GET /agents/:id`

Retorna o agente com todas as configurações aninhadas: `persona`, `modelConfig`, `memoryConfig`, `mediaConfig`, `filterConfig`.

**Cabeçalho da página:**
- Nome do agente + empresa vinculada (breadcrumb)
- Badge de status ativo/inativo + botão toggle
- Botão excluir (com modal)

**Navegação em abas:**

```
[Persona] [Modelo LLM] [Memória] [Mídia] [Filtros]
```

Cada aba exibe os dados atuais + botão "Editar" que abre o formulário correspondente (inline ou modal). O save chama o endpoint específico da aba.

---

### 3.6 Aba Persona — `PATCH /agents/:id/persona`

**Campos:**

| Campo | Componente UI | Detalhe |
|---|---|---|
| Nome da persona | `text` | Como o agente se apresenta ao usuário |
| Descrição da persona | `textarea` | Uso interno |
| System Prompt | `textarea` grande | Principal instrução do LLM — campo crítico |
| Regras de comportamento | `textarea` | Diretrizes de conduta |
| Guardrails | `textarea` | O que o agente NÃO deve fazer |
| Contexto do negócio | `textarea` | Informações da empresa injetadas no prompt |
| Mensagem de boas-vindas | `textarea` | Enviada no início da conversa |
| Tom de voz | `select` | FORMAL / INFORMAL / FRIENDLY / PROFESSIONAL / EMPATHETIC / ASSERTIVE |
| Estilo de comunicação | `select` | CONCISE / DETAILED / TECHNICAL / SIMPLIFIED / BALANCED |
| Idioma | `select` | PT_BR / EN_US / ES_ES |

**Comportamento:**
- O `systemPrompt` é o campo mais crítico — exibir com textarea grande com contador de caracteres
- Exibir campos de texto longo como somente leitura e expandir ao editar

---

### 3.7 Aba Modelo LLM — `PATCH /agents/:id/model-config`

**Campos:**

| Campo | Componente UI | Detalhe |
|---|---|---|
| Provider | `select` | OPENAI / ANTHROPIC / GOOGLE / GROQ |
| Model Name | `text` | Slug OpenRouter (ex: `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`) |
| Temperature | slider + input numérico | 0.0–2.0, step 0.1 |
| Max Tokens | number input | 1–16384 |
| Top P | slider + input numérico | 0.0–1.0, step 0.05 |
| Frequency Penalty | slider + input numérico | −2.0–2.0, step 0.1 |
| Presence Penalty | slider + input numérico | −2.0–2.0, step 0.1 |
| Streaming | toggle | Ativa streaming de tokens |

**Comportamento:**
- Exibir tooltip explicando cada parâmetro (temperature, top_p, penalties)
- Sugestão de modelos populares como placeholder/helper: `openai/gpt-4o`, `anthropic/claude-3-5-sonnet`, `google/gemini-2.0-flash-001`

---

### 3.8 Aba Memória — `PATCH /agents/:id/memory-config`

**Campos:**

| Campo | Componente UI | Visível quando |
|---|---|---|
| Tipo de memória | `select` com cards descritivos | sempre |
| Tamanho da janela | number 1–100 | memoryType = BUFFER |
| Max tokens do resumo | number ≥ 100 | memoryType = SUMMARY |
| Memória de longo prazo | toggle | sempre |

**Tipos de memória — descrições para UI:**
- `BUFFER` — Mantém as últimas N mensagens como contexto direto
- `SUMMARY` — Gera um resumo progressivo das conversas antigas
- `VECTOR` — Busca semântica no histórico via embeddings (requer RAG ativo)
- `NONE` — Sem memória; cada mensagem é tratada isoladamente

**Comportamento:**
- Mostrar/ocultar campos dinamicamente conforme o tipo selecionado
- Badge de aviso quando `memoryType = VECTOR` e RAG não está configurado

---

### 3.9 Aba Mídia — `PATCH /agents/:id/media-config`

Três seções independentes, uma por tipo de mídia:

**Áudio (Whisper):**
- Toggle `audioEnabled`
- `audioDefaultMessage` — textarea — exibido apenas quando `audioEnabled = false`

**Imagem (Vision):**
- Toggle `imageEnabled`
- `imageExtractionPrompt` — textarea — prompt que instrui o Vision a extrair informações da imagem
- `imageDefaultMessage` — textarea — exibido apenas quando `imageEnabled = false`

**Vídeo (Vision via thumbnail):**
- Toggle `videoEnabled`
- `videoExtractionPrompt` — textarea — prompt para análise do frame do vídeo
- `videoDefaultMessage` — textarea — exibido apenas quando `videoEnabled = false`

**Comportamento:**
- Mostrar/ocultar campos de fallback condicionalmente ao toggle
- Exibir hint de que vídeo usa o thumbnail JPEG fornecido pelo WhatsApp

---

### 3.10 Aba Filtros — `PATCH /agents/:id/filter-config`

**Seção 1: Filtro de Acesso**

| Campo | Componente UI | Detalhe |
|---|---|---|
| Telefones permitidos | tag input / array de strings | Formato E.164 sem `+` (ex: `5511999990001`). Vazio = aceita todos |
| Grupos permitidos | tag input / array de strings | chatId do grupo WhatsApp (ex: `120363XXXX@g.us`). Vazio = aceita todos |

**Seção 2: Gatilho Textual**

| Campo | Componente UI | Detalhe |
|---|---|---|
| Habilitar gatilho | toggle | Quando ativo, agente só responde se encontrar trigger word |
| Palavras de gatilho | tag input / array de strings | Ex: `@bot`, `ajuda`, `/start` |
| Case sensitive | toggle | Se ativo, a comparação diferencia maiúsculas |
| Remover gatilho do texto | toggle | Remove a trigger word antes de enviar ao agente |

**Comportamento:**
- Campos da seção 2 desabilitados quando `triggerEnabled = false`
- Exibir banner explicativo: "Quando habilitado, o agente ignora mensagens que não contenham nenhuma das palavras configuradas"
- Para áudio: aviso de que a validação ocorre na transcrição Whisper

---

## 4. Componentes Transversais

### 4.1 Layout Global
- Sidebar com navegação: Companies (link principal)
- Breadcrumb em todas as páginas internas: `Empresas > [Nome Empresa] > Agentes > [Nome Agente]`
- Título da página sincronizado com o nome da entidade

### 4.2 Estados de Loading e Erro
- Skeleton loading em listas e detalhes enquanto dados carregam
- Toast de sucesso após cada save
- Toast de erro com mensagem da API (`error.message`) em caso de falha
- Estado vazio: mensagens amigáveis quando lista está vazia ("Nenhum agente criado ainda")

### 4.3 Modais de Confirmação
- Excluir empresa: "Esta ação é irreversível e removerá todos os agentes vinculados"
- Excluir agente: "Esta ação removerá o agente e todo o seu histórico de conversas"

### 4.4 Toggle de Status (Agente)
- Chama `PATCH /agents/:id/toggle`
- Atualização otimista: inverte o estado localmente antes da resposta da API
- Reverte em caso de erro

---

## 5. Contratos de Dados (Tipos TypeScript)

```typescript
interface Company {
  id: string;
  name: string;
  slug: string;
  email: string | null;
  phone: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentData {
  id: string;
  companyId: string;
  name: string;
  description: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

interface AgentWithConfigs extends AgentData {
  persona: AgentPersona | null;
  modelConfig: AgentModelConfig | null;
  memoryConfig: AgentMemoryConfig | null;
  mediaConfig: AgentMediaConfig | null;
  filterConfig: AgentFilterConfig | null;
}

interface AgentPersona {
  personaName: string;
  personaDescription: string | null;
  systemPrompt: string;
  behaviorGuidelines: string | null;
  guardrails: string | null;
  contextPrompt: string | null;
  welcomeMessage: string | null;
  voiceTone: 'FORMAL' | 'INFORMAL' | 'FRIENDLY' | 'PROFESSIONAL' | 'EMPATHETIC' | 'ASSERTIVE';
  communicationStyle: 'CONCISE' | 'DETAILED' | 'TECHNICAL' | 'SIMPLIFIED' | 'BALANCED';
  language: 'PT_BR' | 'EN_US' | 'ES_ES';
}

interface AgentModelConfig {
  provider: 'OPENAI' | 'ANTHROPIC' | 'GOOGLE' | 'GROQ';
  modelName: string;
  temperature: number;
  maxTokens: number;
  topP: number;
  frequencyPenalty: number;
  presencePenalty: number;
  streaming: boolean;
}

interface AgentMemoryConfig {
  memoryType: 'BUFFER' | 'SUMMARY' | 'VECTOR' | 'NONE';
  windowSize: number;
  maxSummaryTokens: number;
  useLongTermMemory: boolean;
}

interface AgentMediaConfig {
  audioEnabled: boolean;
  audioDefaultMessage: string | null;
  imageEnabled: boolean;
  imageExtractionPrompt: string | null;
  imageDefaultMessage: string | null;
  videoEnabled: boolean;
  videoExtractionPrompt: string | null;
  videoDefaultMessage: string | null;
}

interface AgentFilterConfig {
  allowedPhones: string[];
  allowedGroups: string[];
  triggerEnabled: boolean;
  triggerWords: string[];
  triggerCaseSensitive: boolean;
  triggerRemoveFromText: boolean;
}
```

---

## 6. Endpoints Consumidos — Resumo Completo

| Método | Rota | Página / Ação |
|---|---|---|
| `GET` | `/companies` | `/companies` |
| `POST` | `/companies` | `/companies/new` |
| `GET` | `/companies/:id` | `/companies/[id]` |
| `PATCH` | `/companies/:id` | `/companies/[id]/edit` |
| `DELETE` | `/companies/:id` | Modal excluir empresa |
| `GET` | `/companies/:id/agents` | `/companies/[id]` |
| `POST` | `/companies/:id/agents` | `/companies/[id]/agents/new` |
| `GET` | `/agents/:id` | `/agents/[id]` |
| `PATCH` | `/agents/:id` | Editar dados básicos |
| `PATCH` | `/agents/:id/toggle` | Toggle ativo/inativo |
| `DELETE` | `/agents/:id` | Modal excluir agente |
| `PATCH` | `/agents/:id/persona` | Aba Persona |
| `PATCH` | `/agents/:id/model-config` | Aba Modelo LLM |
| `PATCH` | `/agents/:id/memory-config` | Aba Memória |
| `PATCH` | `/agents/:id/media-config` | Aba Mídia |
| `PATCH` | `/agents/:id/filter-config` | Aba Filtros |

---

## 7. Gerenciamento de Estado e Data Fetching

- **Data fetching:** React Query (`@tanstack/react-query`) para cache, revalidação e estados de loading/error
- **Forms:** React Hook Form + Zod para validação client-side espelhando as validações da API
- **API client:** arquivo `lib/api.ts` centralizado com `fetch` nativo — sem Axios
- **Env:** `NEXT_PUBLIC_API_URL` apontando para a Over Agent API

---

## 8. Fora de Escopo

- Autenticação / autorização
- Visualização de conversas e histórico de mensagens
- Visualização de webhook events (`WebhookEvent`)
- Configuração de Knowledge Base / RAG (virá no futuro junto com o runtime LLM)
- Métricas e analytics
- Configuração de instâncias UAZAPI diretamente pelo painel

---

## 9. Critérios de Aceite

- [ ] É possível criar, listar, editar e excluir empresas
- [ ] É possível criar, listar, editar e excluir agentes dentro de uma empresa
- [ ] Todas as 5 abas de configuração do agente funcionam (persona, modelo, memória, mídia, filtros)
- [ ] O toggle de ativo/inativo do agente funciona na listagem e no detalhe
- [ ] Campos condicionais aparecem/desaparecem corretamente (ex: `windowSize` só quando BUFFER)
- [ ] Erros da API são exibidos ao usuário de forma legível
- [ ] A exclusão de entidades exige confirmação explícita com aviso de irreversibilidade
- [ ] Todos os tipos TypeScript batem com as respostas reais da API
