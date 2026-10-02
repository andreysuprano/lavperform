# MCP para editar a persona dos agentes públicos

**Data:** 2026-09-29
**Status:** Aprovado em conversa
**Contexto:** Um agente interno da Lavperform vai, numa etapa seguinte, ajudar o usuário a ajustar os prompts dos agentes de WhatsApp. Esta entrega cria o servidor MCP que esse agente vai chamar. A ligação com o turno interno fica para depois.

## Objetivo

Expor, no BFF, um servidor MCP em SSE com três ferramentas: listar os agentes públicos da empresa do Lavperform, ler a persona e atualizar só os campos enviados.

## Fora desta entrega

- Abrir esse MCP no turno do agente interno.
- Tela para cadastrar o servidor no dashboard.
- Criar, ativar, desativar ou excluir agente.
- Editar modelo, memória, mídia, filtro, jornada ou notificação.
- Rota nova no motor. O BFF usa as rotas que já existem.
- Checagem de `userCompany` nesta conexão. A credencial é a chave compartilhada com o motor. Quem tem a chave escolhe a empresa pelo header.

## Decisões

| Regra | Valor |
|-------|-------|
| Onde o servidor vive | `api-lavperform`, módulo `public-agent-mcp` |
| Transporte | SSE do `@modelcontextprotocol/sdk`, o mesmo que o cliente do motor já fala |
| Empresa | Header `X-Lavperform-Company-Id`. Não é argumento de ferramenta |
| Credencial | Header `X-Internal-Api-Key`, comparado com `MCP_PUBLIC_AGENTS_API_KEY` |
| Alcance | Só agentes `PUBLIC` da empresa do motor ligada por `overAgentCompanyId` |
| Gravação | `PATCH /agents/:id/persona` no motor, só com os campos enviados |

A empresa não pode ficar gravada na configuração do MCP. Um agente interno atende várias empresas. A empresa entra em cada sessão.

## Sessão

| Método | Caminho | Papel |
|--------|---------|-------|
| `GET` | `/mcp/public-agents/sse` | Abre o stream SSE e fixa a empresa da sessão |
| `POST` | `/mcp/public-agents/messages` | Recebe as mensagens do cliente MCP na sessão já aberta |

O `GET` exige os dois headers. A chave é comparada em tempo constante. Chave ausente no ambiente, ausente na requisição ou diferente: **401**. O processo registra no log quando a variável não está definida. A resposta não diz se a chave falta no servidor ou na requisição.

`X-Lavperform-Company-Id` ausente ou que não seja UUID: **400**.

Empresa inexistente, ou sem `overAgentCompanyId`: **404**. A sessão não abre.

Com a empresa resolvida, o `GET` guarda na sessão o id do Lavperform e o `overAgentCompanyId`. O `POST` só age sobre essa sessão. Um header de empresa no `POST` diferente do que foi fixado no `GET` responde **400** e não troca o tenant. `POST` sem sessão conhecida: **404**. O `POST` também exige a mesma chave.

Duas conexões SSE são duas sessões. Cada uma carrega a própria empresa.

## Ferramentas

Nenhuma recebe a empresa. As três devolvem JSON em texto no conteúdo da ferramenta.

### `list_public_agents`

Sem argumentos. Chama `GET /companies/:overAgentCompanyId/agents`.

Cada item: `id`, `name`, `description`, `active`. Inclui agente inativo. Lista vazia devolve `[]`. Não inclui instância, token, persona, modelo nem memória.

### `get_public_agent_persona`

Argumento: `agentId`. Valor que não seja UUID, agente de outra empresa, agente interno ou id inexistente: erro de ferramenta `Agente não encontrado.`

Antes de devolver, confirma que o agente pertence à empresa da sessão e que é `PUBLIC`.

Resposta: `id`, `name`, `description`, `active` e `persona`. Sem persona gravada, `persona` é `null`. Com persona, o objeto traz:

| Campo | Conteúdo |
|-------|----------|
| `personaName` | Nome nas conversas |
| `personaDescription` | Descrição interna |
| `systemPrompt` | Prompt de sistema |
| `behaviorGuidelines` | Regras |
| `guardrails` | O que o agente não deve fazer |
| `contextPrompt` | Contexto do negócio |
| `welcomeMessage` | Boas-vindas |
| `messageSignature` | Assinatura |
| `voiceTone` | Tom |
| `communicationStyle` | Estilo |
| `language` | Idioma |

### `update_public_agent_persona`

Argumento: `agentId` e ao menos um campo da persona. A mesma checagem de posse do `get`. `agentId` inválido, posse errada ou agente interno: `Agente não encontrado.` Nada é gravado.

A validação segue esta ordem e para no primeiro erro: posse do agente, ausência de campos, tamanho do texto, nome ou prompt em branco, enum inválido, primeira persona incompleta. A posse usa a leitura do agente. O `PATCH` da persona só sai depois que essa sequência passa.

O texto é aparado. Cada texto tem no máximo 32000 caracteres depois do aparo. Acima disso, a ferramenta recusa a chamada inteira.

`personaName` e `systemPrompt`, quando enviados, precisam ter ao menos 1 caractere depois do aparo. String vazia ou só espaço nesses dois campos é erro. Eles não são apagados.

Se o agente ainda não tem persona, a mesma chamada precisa trazer `personaName` e `systemPrompt` preenchidos. Sem os dois, nada é gravado.

Campo de texto opcional enviado como string vazia, ou só com espaço, é gravado como string vazia e limpa o valor. Campo omitido não entra no `PATCH`.

Os opcionais de texto são `personaDescription`, `behaviorGuidelines`, `guardrails`, `contextPrompt`, `welcomeMessage` e `messageSignature`.

Tom, estilo e idioma só aceitam os valores do motor. Valor fora da lista, ou string vazia, é erro e o motor não é chamado.

| Campo | Valores |
|-------|---------|
| `voiceTone` | `FORMAL`, `INFORMAL`, `FRIENDLY`, `PROFESSIONAL`, `EMPATHETIC`, `ASSERTIVE` |
| `communicationStyle` | `CONCISE`, `DETAILED`, `TECHNICAL`, `SIMPLIFIED`, `BALANCED` |
| `language` | `PT_BR`, `EN_US`, `ES_ES` |

Sucesso devolve a persona já gravada, no mesmo formato do `get`.

## Erros da ferramenta

Com a sessão aberta, falha de ferramenta volta como resultado `isError`. O stream SSE permanece aberto. HTTP de erro só na abertura, na tabela da sessão.

| Situação | Texto da ferramenta |
|----------|---------------------|
| Agente inexistente, interno ou de outra empresa | `Agente não encontrado.` |
| Atualização sem nenhum campo | `Informe ao menos um campo da persona.` |
| Nome ou prompt em branco | `Nome da persona e prompt de sistema não podem ficar em branco.` |
| Primeira persona incompleta | `A primeira persona precisa de nome e prompt de sistema.` |
| Texto acima de 32000 caracteres | `Cada texto da persona pode ter no máximo 32000 caracteres.` |
| Enum inválido | `Tom, estilo ou idioma fora dos valores aceitos.` |
| Motor sem resposta, 5xx, ou resposta que não seja a persona esperada | `LavAI indisponível.` |

O detalhe que o cliente do motor devolve (URL, status, texto do Easypanel) fica no log. Não vai para o modelo.

Um 404 do motor em leitura ou gravação também vira `Agente não encontrado.` O texto original do motor não é repassado.

## Testes

Teste de unidade no BFF. O motor é um double. Sem SSE real e sem o processo do `lavai-agent`.

O serviço das ferramentas cobre:

- listar só o que o motor devolveu para o `overAgentCompanyId` da sessão, nos quatro campos
- ler persona gravada e ler agente com `persona: null`
- atualizar só os campos enviados e devolver a persona da resposta do motor
- recusar atualização sem campo, nome ou prompt em branco, primeira persona incompleta, texto acima de 32000 e enum inválido
- `Agente não encontrado.` para id inexistente, agente interno e agente cujo `companyId` não é o da sessão
- string vazia no opcional entra no `PATCH` como `""`; campo omitido não entra
- falha de rede ou 5xx do motor vira `LavAI indisponível.` e não derruba a sessão

A abertura da sessão cobre **401** sem chave válida, **400** com empresa inválida ou empresa do `POST` diferente da sessão, e **404** quando a empresa não existe ou não tem `overAgentCompanyId`.

A variável `MCP_PUBLIC_AGENTS_API_KEY` entra no exemplo de ambiente do `api-lavperform`.
