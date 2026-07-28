# PRD — Visualização de Sub-Steps nas Execuções do Agente

**Produto:** Over Agent — Painel de Administração  
**Feature:** Timeline de Sub-Steps com erros na página de detalhe de execução  
**Versão:** 1.1  
**Data:** Abril 2026  
**Status:** Pronto para implementação frontend  
**Contexto:** Complementa o PRD `prd-agent-trace.md`. A página de detalhe atualmente exibe apenas `inputPrompt` e `outputText`. Este documento especifica a implementação completa da timeline de steps.

---

## 1. Problema

A página de detalhe de uma execução (`GET /agent-runs/:id`) retorna um array `steps` com todas as etapas internas que o agente executou — chamadas ao LLM, buscas RAG, chamadas a tools e erros. Atualmente o frontend ignora esse array e exibe apenas o input e o output final, impossibilitando o diagnóstico de falhas.

---

## 2. Objetivo

Exibir a timeline completa de sub-steps de uma execução com:

- Tipo, nome da ferramenta, duração e iteração de cada step
- Input e output expandíveis como JSON formatado
- Erros destacados visualmente quando `errorMessage` estiver preenchido
- Atualização em tempo real durante execuções `RUNNING` via WebSocket

---

## 3. Fonte de Dados

### 3.1 REST — Histórico

```
GET /agent-runs/:id
```

Retorna `AgentRunDetail` com o array `steps` ordenado por `createdAt`:

```json
{
  "id": "uuid",
  "status": "COMPLETED",
  "inputPrompt": "Qual o consumo da UC 83527249?",
  "outputText": "O consumo da UC é...",
  "iterations": 2,
  "totalToolCalls": 3,
  "durationMs": 4200,
  "startedAt": "2026-04-09T14:00:00.000Z",
  "finishedAt": "2026-04-09T14:00:04.200Z",
  "steps": [ /* ver seção 4 */ ]
}
```

### 3.2 WebSocket — Tempo Real

Namespace: `/agent-trace`  
Protocolo: **Socket.IO**

```js
// Conectar e inscrever
const socket = io('https://<api-host>/agent-trace');
socket.on('connect', () => socket.emit('subscribe', { agentId: '<uuid>' }));

// Eventos a escutar
socket.on('run:step', (payload) => { /* adicionar step à timeline */ });
socket.on('run:completed', (payload) => { /* atualizar status e outputText */ });
socket.on('run:failed', (payload) => { /* exibir erro global da execução */ });
```

Payload do evento `run:step`:

```json
{
  "runId": "uuid",
  "agentId": "uuid",
  "step": {
    "id": "uuid",
    "stepType": "MCP_TOOL_CALL",
    "toolName": "mcp_psm2_Buscar_informacoes_por_CP_e_CS",
    "input": { "cp": "83527249" },
    "output": { "error": "MCP error -32603: Tool not found" },
    "errorMessage": "MCP error -32603: Tool not found",
    "durationMs": 312,
    "iteration": 1,
    "createdAt": "2026-04-09T14:00:01.800Z"
  }
}
```

---

## 4. Estrutura de um Step

Cada item do array `steps` tem a seguinte estrutura:

| Campo | Tipo | Descrição |
|---|---|---|
| `id` | `string` (UUID) | Identificador único do step |
| `stepType` | `string` (enum) | Tipo do passo. Ver seção 5. |
| `toolName` | `string \| null` | Nome da ferramenta ou modelo LLM utilizado |
| `input` | `object \| null` | Dados de entrada do passo (JSON) |
| `output` | `object \| null` | Dados de saída do passo (JSON) |
| `errorMessage` | `string \| null` | **Mensagem de erro real**, preenchida quando o step falhou |
| `durationMs` | `number \| null` | Tempo de execução em milissegundos |
| `iteration` | `number` | Número da iteração do loop (começa em 1 para steps dentro do loop) |
| `createdAt` | `string` (ISO 8601) | Timestamp de criação do step |

---

## 5. Tipos de Step (StepType)

### 5.1 `RAG_SEARCH` — Busca na base de conhecimento

**Ícone:** Lupa / banco de dados  
**Cor:** Roxo

**Input:**
```json
{ "query": "consumo UC 83527249" }
```

**Output:**
```json
{
  "total": 2,
  "chunks": [
    { "content": "A UC 83527249 está localizada em...", "score": 0.91 }
  ]
}
```

---

### 5.2 `LLM_CALL` — Chamada ao modelo de linguagem

**Ícone:** Chip / Sparkle  
**Cor:** Azul

O `toolName` contém o identificador do modelo (ex: `openai/gpt-4o`).

**Input:**
```json
{ "messageCount": 8, "toolCount": 5 }
```

**Output:**
```json
{
  "finishReason": "tool_calls",
  "toolCallCount": 2,
  "contentLength": 0
}
```

Possíveis valores de `finishReason`:
- `"tool_calls"` → o LLM decidiu chamar uma ou mais ferramentas
- `"stop"` → o LLM gerou uma resposta final de texto

---

### 5.3 `TOOL_CALL` — Chamada a ferramenta interna (builtin)

**Ícone:** Engrenagem  
**Cor:** Laranja

O `toolName` é o nome da tool (ex: `search_knowledge`, `get_datetime`, `end_conversation`).

**Input:** os argumentos passados pelo LLM (varia por tool)

**Output:** o retorno da tool

---

### 5.4 `MCP_TOOL_CALL` — Chamada a ferramenta MCP externa

**Ícone:** Plug / Raio  
**Cor:** Ciano

O `toolName` segue o padrão `mcp_<servidor>_<nome_tool>` (ex: `mcp_psm2_Buscar_informacoes_por_CP_e_CS`).

**Input:** argumentos enviados ao servidor MCP

**Output — sucesso:**
```json
[
  { "type": "text", "text": "Consumo: 450 kWh" }
]
```

**Output — falha (quando `errorMessage` está preenchido):**
```json
{ "error": "MCP error -32603: Tool not found" }
```

---

### 5.5 `ERROR` — Erro fatal na execução

**Ícone:** X / Alerta  
**Cor:** Vermelho

Criado quando a execução inteira falha com uma exceção inesperada.

**Input:** `null`  
**Output:** `null`  
**`errorMessage`:** mensagem do erro que causou a falha

---

## 6. Layout da Timeline

### 6.1 Estrutura geral da página de detalhe

```
┌──────────────────────────────────────────────────────────────────┐
│  ← Voltar   ID da Execução (truncado)    [COMPLETED ✓] [4.2s]    │
├──────────────────────────────────────────────────────────────────┤
│  INPUT                                                           │
│  "Qual o consumo da UC 83527249?"                                │
├──────────────────────────────────────────────────────────────────┤
│  OUTPUT                                (visível só se COMPLETED) │
│  "O consumo da UC é 450 kWh..."                                  │
├──────────────────────────────────────────────────────────────────┤
│  TIMELINE DE STEPS           2 iterações · 3 tool calls          │
│                                                                  │
│  ● [ROXO]  RAG_SEARCH           210ms    iter —    ▼ expandido   │
│  │         Input: { "query": "..." }                             │
│  │         Output: { "total": 2, "chunks": [...] }               │
│                                                                  │
│  ● [AZUL]  LLM_CALL             1100ms   iter —    ► recolhido   │
│  ● [CIANO] MCP_TOOL_CALL        312ms    iter 1    ► recolhido   │
│  ● [AZUL]  LLM_CALL             980ms    iter 1    ► recolhido   │
│                                                                  │
│  (spinner se RUNNING)                                            │
└──────────────────────────────────────────────────────────────────┘
```

---

### 6.2 Card de Step (estado recolhido)

```
● [ÍCONE COLORIDO]  MCP_TOOL_CALL · mcp_psm2_Buscar_informacoes_por_CP_e_CS   312ms  iter 1  ►
```

Quando há erro (`errorMessage !== null`), exibir badge vermelho ao lado do tipo:

```
● [ÍCONE VERMELHO]  MCP_TOOL_CALL · mcp_psm2_Buscar_...   312ms  iter 1  [! ERRO]  ►
```

---

### 6.3 Card de Step (estado expandido)

```
▼ [ÍCONE]  MCP_TOOL_CALL · mcp_psm2_Buscar_informacoes_por_CP_e_CS   312ms  iter 1

  ┌── ERRO ──────────────────────────────────────────────────────────┐
  │  MCP error -32603: Tool not found                                │
  └──────────────────────────────────────────────────────────────────┘

  INPUT                                              [Copiar JSON]
  ┌──────────────────────────────────────────────────┐
  │  {                                               │
  │    "cp": "83527249"                              │
  │  }                                               │
  └──────────────────────────────────────────────────┘

  OUTPUT                                             [Copiar JSON]
  ┌──────────────────────────────────────────────────┐
  │  {                                               │
  │    "error": "MCP error -32603: Tool not found"   │
  │  }                                               │
  └──────────────────────────────────────────────────┘
```

---

## 7. Regras Visuais por StepType

| StepType | Ícone sugerido | Cor do indicador | Label de exibição |
|---|---|---|---|
| `RAG_SEARCH` | `DatabaseIcon` / `SearchIcon` | Roxo (`#7C3AED`) | Busca RAG |
| `LLM_CALL` | `SparkleIcon` / `CpuChipIcon` | Azul (`#2563EB`) | LLM |
| `TOOL_CALL` | `WrenchScrewdriverIcon` | Laranja (`#EA580C`) | Tool Builtin |
| `MCP_TOOL_CALL` | `BoltIcon` / `PuzzlePieceIcon` | Ciano (`#0891B2`) | MCP Tool |
| `ERROR` | `ExclamationCircleIcon` | Vermelho (`#DC2626`) | Erro |

**Regra adicional:** qualquer step que tenha `errorMessage !== null` recebe o indicador vermelho, independente do `stepType`.

---

## 8. Comportamento de Erros

### 8.1 Erro em um step específico (`errorMessage` do step)

Ocorre quando uma tool falha (ex: MCP retorna erro, timeout, etc.).

- O step aparece na timeline com borda/indicador vermelho
- Ao expandir, exibe um banner vermelho com a mensagem de `errorMessage` antes do input/output
- O `output` provavelmente conterá `{ "error": "<mensagem>" }` — exibir normalmente no bloco JSON

### 8.2 Erro global da execução (`errorMessage` do AgentRun)

Ocorre quando a execução toda falha (status `FAILED`).

- O header da página exibe o status `FAILED` em vermelho
- Exibir um banner vermelho abaixo do header com o `errorMessage` do run
- Via WebSocket, chega no evento `run:failed` com `errorMessage`

### 8.3 Distinção entre os dois tipos de erro

| Tipo | Onde fica | Quando acontece |
|---|---|---|
| Erro de step | `step.errorMessage` | Uma tool específica falhou, mas a execução continuou |
| Erro global | `agentRun.errorMessage` | A execução inteira falhou e foi interrompida |

---

## 9. Tempo Real (WebSocket)

Quando `status === 'RUNNING'`:

1. Exibir spinner ao final da timeline
2. Escutar `run:step` → adicionar o novo step ao final com animação de entrada (fade + slide)
3. Escutar `run:completed` → remover spinner, atualizar status para `COMPLETED`, exibir `outputText`
4. Escutar `run:failed` → remover spinner, atualizar status para `FAILED`, exibir banner de erro global

Quando a execução já está finalizada (`COMPLETED` ou `FAILED`), não é necessário conectar ao WebSocket — usar apenas os dados do REST.

---

## 10. Exibição de JSON (Input / Output)

- Usar um renderizador de JSON com syntax highlighting (ex: `react-json-view`, `@microlink/react-json-view`, ou bloco `<pre>` com Prism.js)
- Truncar exibição em **50 linhas** por padrão, com botão "Ver mais"
- Botão **"Copiar JSON"** copia o JSON completo para a área de transferência
- Se `input` ou `output` for `null`, exibir texto cinza: `—` (não exibir o bloco)

---

## 11. Exibição da Duração

- Valores abaixo de 1000ms: exibir em ms (ex: `312ms`)
- Valores acima de 1000ms: exibir em segundos com 1 casa decimal (ex: `1.1s`)
- Valor `null`: exibir `—`

---

## 12. Exibição da Iteração

- `iteration === 0`: exibir `—` (passo ocorreu antes do loop de tool calls, ex: RAG e primeiro LLM_CALL)
- `iteration >= 1`: exibir `iter N` (ex: `iter 1`, `iter 2`)

---

## 13. Exemplos de Payload Completo

### Execução com MCP falhando (o caso reportado)

```json
{
  "id": "run-uuid",
  "status": "COMPLETED",
  "inputPrompt": "Qual o consumo da UC 83527249?",
  "outputText": "Ocorreu um erro interno ao consultar os dados da UC 83527249...",
  "iterations": 1,
  "totalToolCalls": 1,
  "durationMs": 2800,
  "steps": [
    {
      "id": "step-1",
      "stepType": "RAG_SEARCH",
      "toolName": "rag_search",
      "input": { "query": "UC 83527249 consumo" },
      "output": { "total": 0, "chunks": [] },
      "errorMessage": null,
      "durationMs": 180,
      "iteration": 0,
      "createdAt": "2026-04-09T19:20:55.100Z"
    },
    {
      "id": "step-2",
      "stepType": "LLM_CALL",
      "toolName": "openai/gpt-4o",
      "input": { "messageCount": 6, "toolCount": 4 },
      "output": { "finishReason": "tool_calls", "toolCallCount": 1, "contentLength": 0 },
      "errorMessage": null,
      "durationMs": 1100,
      "iteration": 0,
      "createdAt": "2026-04-09T19:20:55.300Z"
    },
    {
      "id": "step-3",
      "stepType": "MCP_TOOL_CALL",
      "toolName": "mcp_psm2_Buscar_informacoes_por_CP_e_CS",
      "input": { "cp": "83527249" },
      "output": { "error": "MCP error -32603: Tool not found" },
      "errorMessage": "MCP error -32603: Tool not found",
      "durationMs": 312,
      "iteration": 1,
      "createdAt": "2026-04-09T19:20:56.400Z"
    },
    {
      "id": "step-4",
      "stepType": "LLM_CALL",
      "toolName": "openai/gpt-4o",
      "input": { "messageCount": 9, "toolCount": 4 },
      "output": { "finishReason": "stop", "toolCallCount": 0, "contentLength": 187 },
      "errorMessage": null,
      "durationMs": 980,
      "iteration": 1,
      "createdAt": "2026-04-09T19:20:56.800Z"
    }
  ]
}
```

**Como deve aparecer na timeline:**

```
● [ROXO]   RAG_SEARCH         rag_search                                     180ms   —
● [AZUL]   LLM_CALL           openai/gpt-4o     finishReason: tool_calls     1.1s    —
● [VERM.]  MCP_TOOL_CALL      mcp_psm2_Buscar_informacoes_por_CP_e_CS        312ms   iter 1   [! ERRO]
● [AZUL]   LLM_CALL           openai/gpt-4o     finishReason: stop           980ms   iter 1
```

O step 3 (MCP_TOOL_CALL) deve aparecer com destaque vermelho indicando que o `errorMessage` está preenchido. Ao expandir, deve exibir:

- Banner vermelho: `MCP error -32603: Tool not found`
- Input: `{ "cp": "83527249" }`
- Output: `{ "error": "MCP error -32603: Tool not found" }`

---

## 14. Fora do Escopo deste PRD

- Filtro ou busca dentro dos steps
- Agrupamento de steps por iteração
- Comparação entre duas execuções
- Exportação do trace completo
