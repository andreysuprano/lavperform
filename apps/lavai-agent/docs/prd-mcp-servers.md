# PRD — Gerenciamento de Servidores MCP por Agente

**Produto:** Over Agent — Painel de Configuração  
**Feature:** Integração e Configuração de Servidores MCP (Model Context Protocol)  
**Versão:** 1.0  
**Data:** Abril 2026  
**Status:** Pronto para implementação frontend

---

## 1. Visão Geral

Servidores MCP (Model Context Protocol) permitem estender as capacidades de um agente com **ferramentas externas** (tools) de forma plug-and-play. Exemplos: acesso ao sistema de arquivos, integração com Slack, busca na web, consulta a bancos de dados, etc.

Cada agente pode ter **múltiplos servidores MCP** configurados. Durante a execução de uma conversa, o agente conecta automaticamente a todos os servidores habilitados e disponibiliza suas ferramentas para o modelo de linguagem.

---

## 2. Objetivos

- Permitir que o usuário **adicione, configure, habilite/desabilite e remova** servidores MCP de um agente.
- Suportar dois tipos de transporte: **STDIO** (processo local) e **SSE** (servidor HTTP remoto).
- Dar visibilidade ao usuário sobre quais ferramentas cada servidor expõe.

---

## 3. Usuários Alvo

Administradores e configuradores de agentes dentro do painel Over Agent.

---

## 4. Fluxo Principal

```
Página do Agente
  └── Aba "Ferramentas MCP"
        ├── Lista de servidores MCP configurados
        │     ├── Card do servidor (nome, tipo, status, nº de tools)
        │     ├── Toggle habilitar/desabilitar
        │     ├── Botão Editar
        │     └── Botão Remover
        └── Botão "+ Adicionar Servidor MCP"
              └── Modal / Drawer de criação / edição
```

---

## 5. API de Referência

**Base URL:** `/api` (ou conforme configurado no projeto)

### 5.1 Listar servidores de um agente

```
GET /agents/:agentId/mcp-servers
```

**Response 200:**
```json
[
  {
    "id": "uuid",
    "agentId": "uuid",
    "name": "Filesystem",
    "transport": "STDIO",
    "enabled": true,
    "command": "npx",
    "args": ["-y", "@modelcontextprotocol/server-filesystem", "/data"],
    "env": {},
    "url": null,
    "headers": {},
    "createdAt": "2026-04-09T12:00:00Z",
    "updatedAt": "2026-04-09T12:00:00Z"
  }
]
```

---

### 5.2 Criar servidor MCP

```
POST /agents/:agentId/mcp-servers
```

**Body (STDIO):**
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

**Body (SSE):**
```json
{
  "name": "Meu Servidor Externo",
  "transport": "SSE",
  "enabled": true,
  "url": "https://meu-servidor.com/sse",
  "headers": {
    "Authorization": "Bearer meu-token"
  }
}
```

**Response 201:** objeto `McpServerData` (mesmo formato do GET)

---

### 5.3 Buscar servidor por ID

```
GET /mcp-servers/:id
```

**Response 200:** objeto `McpServerData`  
**Response 404:** `{ "message": "Servidor MCP {id} não encontrado." }`

---

### 5.4 Atualizar servidor

```
PATCH /mcp-servers/:id
```

**Body:** qualquer subconjunto dos campos de criação (todos opcionais).

**Response 200:** objeto `McpServerData` atualizado  
**Response 404:** não encontrado

---

### 5.5 Habilitar / Desabilitar

```
PATCH /mcp-servers/:id/toggle
```

Sem body. Inverte o campo `enabled`.

**Response 200:** objeto `McpServerData` com `enabled` atualizado  
**Response 404:** não encontrado

---

### 5.6 Remover servidor

```
DELETE /mcp-servers/:id
```

**Response 204:** sem body  
**Response 404:** não encontrado

---

## 6. Tipos e Enums

```typescript
type McpTransport = "STDIO" | "SSE";

interface McpServerData {
  id: string;
  agentId: string;
  name: string;
  transport: McpTransport;
  enabled: boolean;

  // STDIO
  command: string | null;
  args: string[];
  env: Record<string, string>;

  // SSE
  url: string | null;
  headers: Record<string, string>;

  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

interface CreateMcpServerPayload {
  name: string;
  transport: McpTransport;
  enabled?: boolean;

  // Obrigatório se transport === "STDIO"
  command?: string;
  args?: string[];
  env?: Record<string, string>;

  // Obrigatório se transport === "SSE"
  url?: string;
  headers?: Record<string, string>;
}

type UpdateMcpServerPayload = Partial<CreateMcpServerPayload>;
```

---

## 7. Requisitos de Interface

### 7.1 Lista de Servidores MCP

**Localização:** Aba ou seção "Ferramentas MCP" na página de configuração do agente.

**Elementos obrigatórios em cada card/linha:**

| Campo | Exibição |
|---|---|
| `name` | Título do card |
| `transport` | Badge: `STDIO` (cinza) ou `SSE` (azul) |
| `enabled` | Toggle switch |
| `command` ou `url` | Subtítulo/descrição resumida |
| `createdAt` | Data de criação (formato relativo ou DD/MM/YYYY) |
| Ações | Botões Editar e Remover |

**Estado vazio:** quando nenhum servidor está configurado, exibir mensagem orientando o usuário a adicionar o primeiro servidor, com botão de ação.

---

### 7.2 Modal / Drawer de Criação e Edição

**Campos comuns (sempre visíveis):**

| Campo | Tipo | Validação | Placeholder |
|---|---|---|---|
| Nome | Input texto | Obrigatório | "Ex: Filesystem, Slack, Web Search" |
| Tipo de transporte | Select / Radio | Obrigatório | "STDIO" ou "SSE" |
| Habilitado | Toggle | — | — |

**Campos STDIO** (visíveis apenas quando `transport === "STDIO"`):

| Campo | Tipo | Validação | Placeholder |
|---|---|---|---|
| Comando | Input texto | Obrigatório | "Ex: npx, python, /usr/bin/node" |
| Argumentos | Input de lista dinâmica (tags/chips) | Opcional | "Ex: -y @mcp/server-filesystem /data" |
| Variáveis de ambiente | Editor de pares chave/valor | Opcional | "API_KEY = ..." |

**Campos SSE** (visíveis apenas quando `transport === "SSE"`):

| Campo | Tipo | Validação | Placeholder |
|---|---|---|---|
| URL | Input URL | Obrigatório, formato URL | "https://meu-servidor.com/sse" |
| Cabeçalhos HTTP | Editor de pares chave/valor | Opcional | "Authorization = Bearer ..." |

**Comportamento do formulário:**
- Ao trocar o tipo de transporte, limpar os campos do tipo anterior.
- Botão Salvar desabilitado enquanto o formulário é inválido.
- Ao salvar, exibir feedback de sucesso (toast/snackbar) e fechar o modal.
- Em caso de erro da API, exibir mensagem de erro dentro do modal (não fechar).

---

### 7.3 Confirmação de Remoção

Antes de deletar, exibir dialog de confirmação:

> **Remover servidor MCP?**  
> O servidor "{nome}" será removido permanentemente. Essa ação não pode ser desfeita.  
> [Cancelar] [Remover]

---

### 7.4 Toggle Habilitar/Desabilitar

- O toggle deve chamar `PATCH /mcp-servers/:id/toggle` imediatamente ao ser acionado.
- Atualizar o estado local otimisticamente e reverter em caso de erro.
- Exibir feedback de erro (toast) se a requisição falhar.

---

## 8. Regras de Negócio

1. **Um agente pode ter zero ou mais servidores MCP.**
2. **Somente servidores com `enabled: true` são conectados** durante as execuções do agente.
3. **Servidores desabilitados** permanecem salvos e podem ser reativados a qualquer momento.
4. **Nomes de tools MCP** são prefixados automaticamente pelo backend no formato `mcp_{nome_server}_{nome_tool}` — o frontend não precisa se preocupar com isso.
5. **Falhas de conexão** com um servidor MCP não bloqueiam a execução do agente — o backend ignora servidores que falham e continua com os demais.

---

## 9. Estados e Feedback Visual

| Situação | Comportamento esperado |
|---|---|
| Lista carregando | Skeleton/loader nos cards |
| Lista vazia | Empty state com CTA para adicionar |
| Servidor desabilitado | Card com opacidade reduzida ou badge "Desabilitado" |
| Salvando (criação/edição) | Botão com loading spinner, campos desabilitados |
| Erro de validação | Mensagem inline embaixo do campo inválido |
| Erro de API | Toast de erro com mensagem descritiva |
| Sucesso ao salvar | Toast "Servidor MCP salvo com sucesso" |
| Sucesso ao remover | Toast "Servidor MCP removido" |

---

## 10. Casos de Uso Exemplares (para testes)

### Caso 1 — Servidor STDIO com servidor de arquivos
```
Nome: Filesystem
Transporte: STDIO
Comando: npx
Args: -y, @modelcontextprotocol/server-filesystem, /tmp/dados
Env: (vazio)
```

### Caso 2 — Servidor SSE com autenticação
```
Nome: API Interna
Transporte: SSE
URL: https://api.empresa.com/mcp/sse
Headers: Authorization = Bearer eyJhbGci...
```

### Caso 3 — Servidor SSE público (sem auth)
```
Nome: Web Search
Transporte: SSE
URL: http://localhost:4000/sse
Headers: (vazio)
```

---

## 11. Fora do Escopo (v1)

- Visualização em tempo real das tools disponibilizadas por cada servidor (ex: listar as tools após conectar).
- Logs de execução de tools MCP por conversa.
- Ordenação / reordenação de servidores.
- Duplicar configuração de servidor.
- Templates prontos de servidores MCP populares.

Esses itens podem ser considerados para versões futuras.

---

## 12. Critérios de Aceite

- [ ] É possível adicionar um servidor STDIO com comando, args e env preenchidos.
- [ ] É possível adicionar um servidor SSE com URL e headers.
- [ ] Os campos exibidos mudam corretamente ao trocar o tipo de transporte no formulário.
- [ ] O toggle habilitar/desabilitar funciona sem precisar recarregar a página.
- [ ] A remoção exige confirmação antes de executar.
- [ ] Erros de API são exibidos de forma amigável (sem quebrar a UI).
- [ ] Estado vazio é exibido quando nenhum servidor está cadastrado.
- [ ] As alterações persistem após recarregar a página.
