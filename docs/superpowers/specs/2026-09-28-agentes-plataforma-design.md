# Agentes de plataforma da Lavperform

**Data:** 2026-09-28
**Status:** Aprovado em conversa
**Contexto:** O LavAI hoje atende o cliente do cliente no WhatsApp. A Lavperform precisa de agentes seus, que conversem com o usuário da plataforma e, numa etapa seguinte, operem os dados da empresa logada. Esta entrega cria o tipo, o catálogo e a API que o app consome para conversar. Tool, MCP e relatório ficam para depois.

## Objetivo

1. Diferenciar o agente da Lavperform do agente público de WhatsApp.
2. Permitir que quem opera a Lavperform configure esse catálogo.
3. Expor no BFF a API autenticada que o app usa para listar esses agentes e conversar com eles, no contexto do usuário logado e da empresa selecionada.

## Fora desta entrega

- Tool, MCP, RAG e relatório.
- Telas no `lavperform-app` e no `lavai-dashboard`.
- Segundo processo ou segundo banco.
- Auth nova no motor. As rotas de configuração seguem o mesmo acesso de rede privada das rotas `/agents` atuais.
- Lock para turnos simultâneos do mesmo trio. Duas respostas ao mesmo tempo podem intercalar mensagens.

## Decisões

| Regra | Valor |
|-------|-------|
| Dono do agente interno | Catálogo único da Lavperform, não de cada cliente |
| Empresa do cliente | Contexto da conversa e, depois, dos dados. Não é dona do agente |
| Runtime | O mesmo `lavai-agent`. Superfície e tabelas de conversa separadas |
| Prefixo do produto | `/platform-agents` no motor e no BFF. `/ai-agents` continua só no WhatsApp |
| Conversa | Uma por agente + empresa do Lavperform + usuário |
| Resposta desta entrega | Persona, memória e uma chamada ao LLM. Sem tool e sem WhatsApp |
| Quem configura | Operador, direto no motor |
| Quem conversa | App, via BFF, com JWT e vínculo `userCompany` |

## Modelo

### Tipo do agente

Enum `AgentKind`: `PUBLIC` e `INTERNAL`. Coluna `kind` em `Agent`, padrão `PUBLIC`. Os agentes já gravados permanecem públicos. O webhook da UAZAPI só resolve agente `PUBLIC`.

As rotas atuais `/companies/:companyId/agents` e `/agents/:id` devolvem 404 quando o agente é `INTERNAL`. Instância, jornada, filtro, mídia e notificação não se aplicam a ele.

### Empresa plataforma

A migration cria, se ainda não existir, a empresa do motor com slug `lavperform-platform` e nome `Lavperform`. Todo agente `INTERNAL` usa o `companyId` dessa linha. A busca é pelo slug.

O id da empresa cliente guardado na conversa é o `Company.id` do `api-lavperform`. Não é o `overAgentCompanyId`.

### Conversa

`PlatformConversation`:

| Campo | Papel |
|-------|-------|
| `id` | UUID |
| `agentId` | Agente `INTERNAL`. Apaga em cascata com o agente |
| `contextCompanyId` | `Company.id` do Lavperform |
| `platformUserId` | `User.id` do JWT |
| `createdAt`, `updatedAt` | |

Único em (`agentId`, `contextCompanyId`, `platformUserId`).

`PlatformConversationMessage`: `id`, `conversationId`, `role` (`USER` ou `ASSISTANT`), `content`, `createdAt`. Sem telefone, instância ou token.

## Configuração no motor

Controller novo. Não passa pelo fluxo que registra webhook na UAZAPI.

| Método | Caminho | Efeito |
|--------|---------|--------|
| `POST` | `/platform-agents` | Cria `INTERNAL` na empresa plataforma |
| `GET` | `/platform-agents` | Lista os internos, ativos e inativos |
| `GET` | `/platform-agents/:id` | Agente com persona, modelo e memória |
| `PATCH` | `/platform-agents/:id` | Nome e descrição |
| `PATCH` | `/platform-agents/:id/persona` | Mesmo contrato de persona já usado |
| `PATCH` | `/platform-agents/:id/model-config` | Mesmo contrato de modelo |
| `PATCH` | `/platform-agents/:id/memory-config` | Mesmo contrato de memória |
| `PATCH` | `/platform-agents/:id/toggle` | Ativa ou desativa |
| `DELETE` | `/platform-agents/:id` | Remove o agente e a conversa em cascata |

O `POST` aceita `name`, `description` opcional e os blocos opcionais `persona`, `modelConfig` e `memoryConfig`, no formato do criar agente atual. Não aceita `instanceName`. O servidor grava `kind: INTERNAL` e o `companyId` da empresa plataforma.

`GET` e mutações nesse prefixo respondem 404 se o id não for de um agente `INTERNAL`.

## Consumo no BFF

Controller novo, com `AuthGuard('jwt')`. Não usa `AiAgentService`: aquele serviço provisiona webhook de WhatsApp.

O catálogo não depende da empresa. O turno e o histórico dependem. O app envia o id da empresa selecionada. O BFF confirma `userCompany` com o `userId` do token. Sem vínculo, 403.

| Método | Caminho | Resposta |
|--------|---------|----------|
| `GET` | `/platform-agents` | Catálogo ativo |
| `GET` | `/platform-agents/:agentId` | Um agente ativo |
| `POST` | `/platform-agents/:agentId/turns` | `{ conversationId, reply }` |
| `GET` | `/platform-agents/:agentId/turns?companyId=&limit=` | Histórico desse trio |

Item do catálogo: `id`, `name`, `description`, `personaName`, `welcomeMessage`. Sem persona gravada, `personaName` e `welcomeMessage` vêm `null`. Sem system prompt, guardrail ou configuração de modelo.

Corpo do `POST`: `companyId` (UUID) e `text`. O texto é aparado. Menos de 1 caractere ou mais de 8000 responde 400.

O `GET` do histórico exige `companyId`. `limit` padrão 50, máximo 100. Devolve as últimas N mensagens em ordem cronológica crescente: `{ conversationId, messages: [{ id, role, content, createdAt }] }`. Sem conversa ainda, `200` com `conversationId: null` e `messages: []`.

Agente inexistente, de outro tipo ou inativo: 404.

## Turno

1. O BFF carrega o usuário e a empresa. Manda ao motor `contextCompanyId`, `platformUserId`, `userName` (`User.name`), `companyName` (`Company.name`) e `text`.
2. O motor expõe `POST /platform-agents/:id/turns` com esse corpo. Só o BFF chama. A rota recusa agente que não seja `INTERNAL` ativo.
3. Abre ou reusa a `PlatformConversation` do trio.
4. Grava a mensagem `USER`.
5. Carrega as mensagens anteriores dessa conversa, até `memoryConfig.windowSize` (padrão 10), sem a mensagem recém-gravada.
6. Monta o prompt com o `PromptBuilderService`. `ragChunks` vazio. Não passa o `SenderContext` de WhatsApp. Um argumento novo, opcional, acrescenta só este bloco quando o turno de plataforma o preenche:

```
## Sessão atual
- Usuário: {userName}
- Empresa: {companyName}
```

O caminho do WhatsApp continua enviando telefone, chat e grupo como hoje.
7. Uma conclusão no LLM, com o `modelConfig` do agente. Sem tool, sem MCP, sem RAG, sem `MessageSender`, sem assinatura e sem quebra em várias mensagens.
8. Grava a mensagem `ASSISTANT` com o texto do modelo e devolve esse texto.
9. Registra `AgentRun` no rastreador já existente: início, passo de LLM, conclusão ou falha. Sem passo de RAG nem de tool.

Se o modelo falha, ou devolve texto vazio, a resposta é 502. A mensagem do usuário permanece. A do assistente não é gravada. O run fica `FAILED`.

## Erros

| Situação | Código |
|----------|--------|
| Usuário sem `userCompany` para o `companyId` | 403 no BFF |
| Id que não é agente `INTERNAL`, no motor ou no BFF | 404 |
| Agente `INTERNAL` inativo no catálogo, no detalhe ou no turno do BFF, e no turno do motor | 404 |
| Agente `INTERNAL` inativo no `GET`, `PATCH`, `toggle` e `DELETE` de configuração do motor | 200 ou 204, para o operador poder reativar |
| `text` vazio ou acima de 8000, ou `companyId` inválido | 400 |
| Falha ou resposta vazia do modelo | 502 |
| Empresa plataforma ausente no motor | 500, com log do slug `lavperform-platform` |

## Testes

- Agente criado pela rota antiga nasce `PUBLIC`.
- `POST /platform-agents` grava `INTERNAL` na empresa `lavperform-platform` e rejeita `instanceName`.
- `PATCH /agents/:id/persona` num agente interno responde 404.
- Webhook não seleciona agente `INTERNAL`.
- Dois turnos do mesmo trio compartilham histórico, e a segunda chamada vê a primeira pergunta uma vez só.
- Outro usuário, ou outra `contextCompanyId`, abre outra conversa.
- BFF sem vínculo `userCompany` responde 403.
- Agente público, inexistente ou inativo no prefixo de plataforma responde 404.
- Falha do modelo responde 502, mantém a mensagem do usuário e não grava assistente.
- O prompt do turno de plataforma não contém telefone, chat id nem remoteJid.
