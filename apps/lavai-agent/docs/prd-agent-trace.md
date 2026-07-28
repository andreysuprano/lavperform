# PRD — Agent Trace & Observabilidade

**Produto:** Over Agent — Painel de Administração  
**Feature:** Visualização em tempo real e histórico de execuções do agente  
**Versão:** 1.0  
**Data:** Abril 2026  
**Status:** Pronto para implementação frontend

---

## 1. Visão Geral

O **Agent Trace** é uma funcionalidade de observabilidade que permite acompanhar, em tempo real ou de forma histórica, cada execução do agente: desde a mensagem recebida até a resposta enviada, passando por cada chamada ao LLM, pesquisa RAG e tool calls (builtin e MCP).

O objetivo é dar visibilidade total ao operador sobre o que está acontecendo dentro do agente, facilitando o debug de erros, a análise de performance e a auditoria de comportamento.

---

## 2. Objetivos

- Listar execuções do agente com status, duração e contagem de iterações.
- Visualizar em tempo real cada passo de uma execução ativa.
- Inspecionar os detalhes de cada step: inputs, outputs, erros e tempo.
- Filtrar e buscar execuções por agente, conversa ou status.

---

## 3. Usuários Alvo

Administradores técnicos e configuradores de agentes que precisam monitorar o comportamento do agente e depurar problemas.

---

## 4. Conceitos

| Conceito | Descrição |
|---|---|
| **AgentRun** | Representa uma execução completa do agente: uma mensagem recebida → processada → respondida. |
| **AgentRunStep** | Cada etapa individual dentro de uma execução (ex: busca RAG, chamada LLM, tool call). |
| **Status** | `RUNNING` (em andamento), `COMPLETED` (concluído com sucesso), `FAILED` (falhou com erro). |
| **StepType** | Tipo do passo: `RAG_SEARCH`, `LLM_CALL`, `TOOL_CALL`, `MCP_TOOL_CALL`, `ERROR`. |

---

## 5. API Backend

### Base URL
```
https://<api-host>
```

### 5.1 Listar execuções

```
GET /agent-runs
```

**Query params:**

| Parâmetro | Tipo | Obrigatório | Descrição |
|---|---|---|---|
| `agentId` | string (UUID) | Não | Filtra por agente |
| `companyId` | string (UUID) | Não | Filtra por empresa |
| `conversationId` | string (UUID) | Não | Filtra por conversa |
| `status` | `RUNNING` \| `COMPLETED` \| `FAILED` | Não | Filtra por status |
| `page` | number | Não | Página (default: 1) |
| `limit` | number | Não | Itens por página (default: 20, máx: 100) |

**Response `200`:**

```json
{
  "data": [
    {
      "id": "uuid",
      "agentId": "uuid",
      "companyId": "uuid",
      "conversationId": "uuid",
      "status": "COMPLETED",
      "inputPrompt": "Olá, preciso de ajuda com...",
      "errorMessage": null,
      "startedAt": "2026-04-09T14:00:00.000Z",
      "finishedAt": "2026-04-09T14:00:03.500Z",
      "durationMs": 3500,
      "iterations": 2,
      "totalToolCalls": 3
    }
  ],
  "total": 42,
  "page": 1,
  "limit": 20
}
```

---

### 5.2 Detalhes de uma execução (com steps)

```
GET /agent-runs/:id
```

**Response `200`:**

```json
{
  "id": "uuid",
  "agentId": "uuid",
  "companyId": "uuid",
  "conversationId": "uuid",
  "status": "COMPLETED",
  "inputPrompt": "Olá, preciso de ajuda com...",
  "outputText": "Claro! Posso te ajudar com...",
  "errorMessage": null,
  "startedAt": "2026-04-09T14:00:00.000Z",
  "finishedAt": "2026-04-09T14:00:03.500Z",
  "durationMs": 3500,
  "iterations": 2,
  "totalToolCalls": 3,
  "steps": [
    {
      "id": "uuid",
      "agentRunId": "uuid",
      "stepType": "RAG_SEARCH",
      "toolName": "rag_search",
      "input": { "query": "ajuda com produto X" },
      "output": { "total": 3, "chunks": [{ "content": "...", "score": 0.92 }] },
      "errorMessage": null,
      "durationMs": 210,
      "iteration": 0,
      "createdAt": "2026-04-09T14:00:00.100Z"
    },
    {
      "id": "uuid",
      "agentRunId": "uuid",
      "stepType": "LLM_CALL",
      "toolName": "openai/gpt-4o",
      "input": { "messageCount": 8, "toolCount": 5 },
      "output": { "finishReason": "tool_calls", "toolCallCount": 2, "contentLength": 0 },
      "errorMessage": null,
      "durationMs": 1100,
      "iteration": 0,
      "createdAt": "2026-04-09T14:00:00.350Z"
    },
    {
      "id": "uuid",
      "agentRunId": "uuid",
      "stepType": "MCP_TOOL_CALL",
      "toolName": "mcp_filesystem_read_file",
      "input": { "path": "/data/products.txt" },
      "output": { "content": "Produto X: ..." },
      "errorMessage": null,
      "durationMs": 340,
      "iteration": 1,
      "createdAt": "2026-04-09T14:00:01.500Z"
    }
  ]
}
```

**Response `404`:**
```json
{ "statusCode": 404, "message": "AgentRun <id> não encontrado" }
```

---

## 6. WebSocket (Tempo Real)

### Conexão

```
ws://<api-host>/agent-trace
```

Protocolo: **Socket.IO** (não WebSocket puro).

### Inscrição em um agente

Após conectar, emitir o evento `subscribe` para receber eventos de um agente específico:

```js
socket.emit('subscribe', { agentId: '<uuid>' });
```

Para cancelar:

```js
socket.emit('unsubscribe', { agentId: '<uuid>' });
```

### Eventos recebidos

#### `run:started`
Disparado quando uma nova execução começa.

```json
{
  "runId": "uuid",
  "agentId": "uuid",
  "companyId": "uuid",
  "conversationId": "uuid",
  "inputPrompt": "Olá, preciso de ajuda...",
  "startedAt": "2026-04-09T14:00:00.000Z"
}
```

#### `run:step`
Disparado a cada passo concluído dentro de uma execução.

```json
{
  "runId": "uuid",
  "agentId": "uuid",
  "step": {
    "id": "uuid",
    "stepType": "LLM_CALL",
    "toolName": "openai/gpt-4o",
    "input": { "messageCount": 8, "toolCount": 5 },
    "output": { "finishReason": "stop", "contentLength": 342 },
    "errorMessage": null,
    "durationMs": 1200,
    "iteration": 0,
    "createdAt": "2026-04-09T14:00:01.200Z"
  }
}
```

#### `run:completed`
Disparado quando uma execução termina com sucesso.

```json
{
  "runId": "uuid",
  "agentId": "uuid",
  "outputText": "Claro! Posso te ajudar com...",
  "iterations": 2,
  "totalToolCalls": 3,
  "durationMs": 3500,
  "finishedAt": "2026-04-09T14:00:03.500Z"
}
```

#### `run:failed`
Disparado quando uma execução falha.

```json
{
  "runId": "uuid",
  "agentId": "uuid",
  "errorMessage": "LLM provider timeout",
  "finishedAt": "2026-04-09T14:00:05.000Z"
}
```

---

## 7. Telas e Componentes

### 7.1 Lista de Execuções

**Rota sugerida:** `/agents/:agentId/runs`

**Comportamento:**
- Tabela paginada com as colunas: Status, Conversa, Duração, Iterações, Tool Calls, Data/hora.
- Badge colorido por status: `RUNNING` (azul/pulsando), `COMPLETED` (verde), `FAILED` (vermelho).
- Filtro rápido por status (tabs ou dropdown).
- Linha clicável abre o detalhe da execução.
- Atualização em tempo real via WebSocket: novas execuções aparecem no topo sem reload.

**Estados vazios:**
- Sem execuções ainda: ilustração + texto "Nenhuma execução registrada ainda."
- Erro de conexão: mensagem de erro com botão de retry.

---

### 7.2 Detalhe da Execução (Timeline)

**Rota sugerida:** `/agents/:agentId/runs/:runId`

**Layout:**

```
┌─────────────────────────────────────────────────┐
│  Header: RunId (truncado) | Status | Duração     │
│  Input: "mensagem do usuário..."                 │
│  Output: "resposta do agente..." (quando pronto) │
├─────────────────────────────────────────────────┤
│  Timeline vertical de steps                      │
│                                                  │
│  ● RAG_SEARCH        210ms    ▶ expandir         │
│  ● LLM_CALL          1100ms   ▶ expandir         │
│  ● MCP_TOOL_CALL     340ms    ▶ expandir         │
│  ● LLM_CALL          980ms    ▶ expandir         │
│  ● [spinner quando RUNNING]                      │
└─────────────────────────────────────────────────┘
```

**Comportamento:**
- Se a execução está `RUNNING`, novos steps chegam via WebSocket e são adicionados ao final da timeline em tempo real (animação de entrada).
- Quando chega `run:completed` ou `run:failed`, o status no header é atualizado e o spinner some.
- Cada step é expansível (accordion) mostrando `input` e `output` como JSON formatado.
- Steps com erro mostram o campo `errorMessage` em destaque vermelho.

---

### 7.3 Indicadores Visuais por StepType

| StepType | Ícone sugerido | Cor |
|---|---|---|
| `RAG_SEARCH` | Lupa / Banco de dados | Roxo |
| `LLM_CALL` | Chip / Sparkle | Azul |
| `TOOL_CALL` | Ferramenta / Engrenagem | Laranja |
| `MCP_TOOL_CALL` | Plug / Raio | Ciano |
| `ERROR` | X / Alerta | Vermelho |

---

## 8. Integração Socket.IO (exemplo React)

```tsx
import { useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';

function useAgentTrace(agentId: string) {
  const [runs, setRuns] = useState<AgentRunSummary[]>([]);

  useEffect(() => {
    const socket: Socket = io('http://localhost:3000/agent-trace');

    socket.on('connect', () => {
      socket.emit('subscribe', { agentId });
    });

    socket.on('run:started', (payload) => {
      setRuns((prev) => [{ ...payload, status: 'RUNNING', steps: [] }, ...prev]);
    });

    socket.on('run:completed', (payload) => {
      setRuns((prev) =>
        prev.map((r) => r.id === payload.runId ? { ...r, ...payload, status: 'COMPLETED' } : r)
      );
    });

    socket.on('run:failed', (payload) => {
      setRuns((prev) =>
        prev.map((r) => r.id === payload.runId ? { ...r, ...payload, status: 'FAILED' } : r)
      );
    });

    return () => {
      socket.emit('unsubscribe', { agentId });
      socket.disconnect();
    };
  }, [agentId]);

  return runs;
}
```

---

## 9. Requisitos Não-Funcionais

- A conexão WebSocket deve reconectar automaticamente em caso de queda (Socket.IO já faz isso por padrão).
- A lista de execuções deve suportar pelo menos 100 itens sem degradação visual (virtualização se necessário).
- O JSON de input/output nos steps pode ser grande; truncar para exibição e oferecer opção de copiar o JSON completo.
- A página de detalhe deve funcionar sem WebSocket (modo histórico), carregando via REST quando a execução já está finalizada.

---

## 10. Requisitos de Segurança

- Todos os endpoints REST exigem autenticação (Bearer token ou cookie de sessão — a definir conforme o padrão do painel).
- O WebSocket também deve validar a identidade do cliente na conexão (token via `auth` do Socket.IO ou query param).

---

## 11. Fora do Escopo (v1)

- Comparação entre execuções.
- Replay / reenvio de uma execução.
- Alertas ou notificações por email/push.
- Gráficos de métricas agregadas (latência média, taxa de erro, etc.).
